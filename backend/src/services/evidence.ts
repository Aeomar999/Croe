import { createHash } from "node:crypto";
import { createWriteStream, createReadStream } from "node:fs";
import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Readable } from "node:stream";
import { getTransactionClient } from "../db/pool.js";
import { AppError } from "../middleware/error-handler.js";
import type { ForensicContext } from "../middleware/forensic.js";
import { logger } from "../config/logger.js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
]);

type EvidenceRow = {
  artifact_id: string;
  transaction_id: string;
  uploader_id: string;
  file_url: string;
  sha256_hash: string;
  artifact_type: string;
  ip_address: string;
  device_id: string;
  created_at: Date;
};

// S3 Client initialization (lazy loading environment variables)
let s3Client: S3Client | null = null;
function getS3Client() {
  if (!s3Client) {
    if (process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY) {
      s3Client = new S3Client({
        region: process.env.S3_REGION || "auto",
        endpoint: process.env.S3_ENDPOINT,
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY,
          secretAccessKey: process.env.S3_SECRET_KEY,
        },
      });
    }
  }
  return s3Client;
}

/**
 * Compute SHA-256 hash on-the-fly while streaming to a temp file on disk.
 * Never buffers the entire file in memory (AUD-03).
 */
async function streamHashToTempFile(
  inputStream: Readable,
  tempPath: string,
): Promise<string> {
  const hash = createHash("sha256");

  return new Promise<string>((resolve, reject) => {
    const fileWrite = createWriteStream(tempPath);
    let bytesWritten = 0;

    inputStream.on("data", (chunk: Buffer) => {
      bytesWritten += chunk.length;
      if (bytesWritten > MAX_FILE_SIZE) {
        inputStream.destroy();
        fileWrite.destroy();
        reject(new AppError(413, "File too large (max 25 MB)", "FILE_TOO_LARGE"));
        return;
      }
      hash.update(chunk);
    });

    inputStream.pipe(fileWrite);

    fileWrite.on("finish", () => {
      const sha256 = hash.digest("hex");
      resolve(sha256);
    });

    fileWrite.on("error", (err) => {
      reject(err);
    });

    inputStream.on("error", (err) => {
      fileWrite.destroy();
      reject(err);
    });
  });
}

/**
 * Check if a SHA-256 hash exists for a DIFFERENT transaction.
 * Same transaction is allowed (re-upload).
 */
async function isRecycledEvidence(
  sha256Hash: string,
  transactionId: string,
): Promise<boolean> {
  const { rows } = await getTransactionClient().then(async (client) => {
    try {
      return await client.query<{ exists: boolean }>(
        `SELECT EXISTS (SELECT 1 FROM evidence_artifacts WHERE sha256_hash = $1 AND transaction_id != $2)`,
        [sha256Hash, transactionId],
      );
    } finally {
      client.release();
    }
  });
  return rows[0]?.exists ?? false;
}

/**
 * Upload evidence artifact.
 *
 * Flow:
 * 1. Stream file to temp disk, compute SHA-256 on-the-fly
 * 2. Check recycled evidence (409 if reused across transactions)
 * 3. Upload file to Object Storage (S3/R2) with content-addressed path
 * 4. INSERT evidence_artifacts row
 * 5. Write EVIDENCE_ADDED ledger entry
 *
 * AUD-03: hash computed on the fly. AUD-02: forensic capture from headers.
 */
export async function uploadEvidence(p: {
  transactionId: string;
  uploaderId: string;
  artifactType: string;
  fileName: string;
  mimeType: string;
  fileStream: Readable;
  forensic?: ForensicContext;
}): Promise<EvidenceRow> {
  if (!ALLOWED_MIME_TYPES.has(p.mimeType)) {
    throw new AppError(415, `Unsupported file type: ${p.mimeType}. Allowed: JPEG, PNG, WebP, HEIC, PDF`, "UNSUPPORTED_MEDIA_TYPE");
  }

  const ext = p.fileName.split(".").pop() ?? "bin";
  const tempPath = join(tmpdir(), `croe_${p.transactionId}_${Date.now()}.${ext}`);

  // Step 1: Stream to temp disk + hash
  const sha256Hash = await streamHashToTempFile(p.fileStream, tempPath);

  try {
    // Step 2: Recycled evidence check (14-Evidence-and-Forensics.md §4)
    const recycled = await isRecycledEvidence(sha256Hash, p.transactionId);
    if (recycled) {
      throw new AppError(
        409,
        "This file has already been submitted as evidence for another transaction",
        "EVIDENCE_RECYCLED",
      );
    }

    // Step 3: Upload to S3/R2
    const s3 = getS3Client();
    const objectKey = `uploads/${sha256Hash.slice(0, 2)}/${sha256Hash}.${ext}`;
    
    if (s3) {
      const fileReadStream = createReadStream(tempPath);
      await s3.send(new PutObjectCommand({
        Bucket: process.env.S3_BUCKET || "croe-evidence-prod",
        Key: objectKey,
        Body: fileReadStream,
        ContentType: p.mimeType,
      }));
    } else {
      logger.warn("S3 Client not configured, skipping actual upload to storage.");
    }

    const fileUrl = s3 ? `s3://${process.env.S3_BUCKET}/${objectKey}` : objectKey;

    // Step 4+5: DB insert + ledger in one transaction (DB-01)
    const client = await getTransactionClient();
    try {
      await client.query("BEGIN");

      const { rows } = await client.query<EvidenceRow>(
        `INSERT INTO evidence_artifacts
           (transaction_id, uploader_id, file_url, sha256_hash, artifact_type, ip_address, device_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          p.transactionId,
          p.uploaderId,
          fileUrl,
          sha256Hash,
          p.artifactType,
          p.forensic?.ip ?? "unknown",
          p.forensic?.deviceId ?? "unknown",
        ],
      );

      const { rows: escrowRows } = await client.query<{ current_status: string }>(
        `SELECT current_status FROM escrow_transactions WHERE transaction_id = $1`,
        [p.transactionId]
      );
      const currentStatus = escrowRows[0]?.current_status ?? "DISPUTE_OPENED";

      // EVIDENCE_ADDED ledger entry (AUD-01: append-only)
      await client.query(
        `INSERT INTO transaction_ledger
           (transaction_id, actor_id, event_type, previous_status, new_status, ip_address, device_id, network_type)
         VALUES ($1, $2, 'EVIDENCE_ADDED', $3, $3, $4, $5, $6)`,
        [
          p.transactionId,
          p.uploaderId,
          currentStatus,
          p.forensic?.ip ?? null,
          p.forensic?.deviceId ?? null,
          p.forensic?.networkType ?? null,
        ],
      );

      await client.query("COMMIT");
      logger.info({ artifactId: rows[0].artifact_id, sha256: sha256Hash }, "Evidence uploaded");
      return rows[0]!;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } finally {
    // Always clean up temp file
    await unlink(tempPath).catch(() => {});
  }
}
