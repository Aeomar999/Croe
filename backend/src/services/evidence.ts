import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, rename } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";
import { getTransactionClient } from "../db/pool.js";
import { AppError } from "../middleware/error-handler.js";
import type { ForensicContext } from "../middleware/forensic.js";
import { logger } from "../config/logger.js";

const UPLOAD_DIR = join(process.cwd(), "uploads");
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

/**
 * Compute SHA-256 hash on-the-fly while streaming to disk.
 * Never buffers the entire file in memory (AUD-03).
 */
async function streamHashToFile(
  inputStream: Readable,
  destPath: string,
): Promise<string> {
  await mkdir(join(destPath, ".."), { recursive: true });

  const tempPath = `${destPath}.tmp.${Date.now()}`;
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

    fileWrite.on("finish", async () => {
      const sha256 = hash.digest("hex");
      try {
        await rename(tempPath, destPath);
        resolve(sha256);
      } catch (err) {
        reject(err);
      }
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
 * 1. Stream file, compute SHA-256 on-the-fly
 * 2. Check recycled evidence (409 if reused across transactions)
 * 3. Store file with content-addressed path
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

  // Content-addressed path: uploads/<sha256 first 2 chars>/<sha256>.<ext>
  const ext = p.fileName.split(".").pop() ?? "bin";
  const destDir = join(UPLOAD_DIR, "pending");
  const destPath = join(destDir, `${p.transactionId}_${Date.now()}.${ext}`);

  // Step 1+2: Stream + hash
  const sha256Hash = await streamHashToFile(p.fileStream, destPath);

  // Step 3: Recycled evidence check (14-Evidence-and-Forensics.md §4)
  const recycled = await isRecycledEvidence(sha256Hash, p.transactionId);
  if (recycled) {
    // Clean up the stored file
    const { unlink } = await import("node:fs/promises");
    await unlink(destPath).catch(() => {});
    throw new AppError(
      409,
      "This file has already been submitted as evidence for another transaction",
      "EVIDENCE_RECYCLED",
    );
  }

  // Move to final content-addressed path
  const finalDir = join(UPLOAD_DIR, sha256Hash.slice(0, 2));
  const finalPath = join(finalDir, `${sha256Hash}.${ext}`);
  await mkdir(finalDir, { recursive: true });
  const { rename: fsRename } = await import("node:fs/promises");
  await fsRename(destPath, finalPath);

  // Step 4+5: DB insert + ledger in one transaction (DB-01)
  const client = await getTransactionClient();
  try {
    await client.query("BEGIN");

    const fileUrl = `uploads/${sha256Hash.slice(0, 2)}/${sha256Hash}.${ext}`;

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

    // EVIDENCE_ADDED ledger entry (AUD-01: append-only)
    await client.query(
      `INSERT INTO transaction_ledger
         (transaction_id, actor_id, event_type, previous_status, new_status, ip_address, device_id, network_type)
       VALUES ($1, $2, 'EVIDENCE_ADDED', NULL, NULL, $3, $4, $5)`,
      [
        p.transactionId,
        p.uploaderId,
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
    // Clean up file on DB failure
    const { unlink } = await import("node:fs/promises");
    await unlink(finalPath).catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
