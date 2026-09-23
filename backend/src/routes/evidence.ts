import { Router, type Router as RouterType } from "express";
import type { Request, Response } from "express";
import { authenticate } from "../middleware/auth.js";
import multer from "multer";
import { requireIdempotencyKey, idempotencyGuard } from "../middleware/idempotency.js";
import { evidenceRateLimiter } from "../middleware/rate-limiter.js";
import { uploadEvidence } from "../services/evidence.js";
import { AppError } from "../middleware/error-handler.js";

const router: RouterType = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_TYPES = new Set(["PACKAGING_PHOTO", "DAMAGED_ITEM", "RECEIPT", "SCREENSHOT", "OTHER"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
});

/**
 * POST /v1/evidence/upload — Upload evidence artifact
 * Multipart: file (required), transaction_id (form field), artifact_type (form field)
 * 14-Evidence-and-Forensics.md §2
 */
router.post(
  "/evidence/upload",
  authenticate,
  evidenceRateLimiter,
  requireIdempotencyKey,
  idempotencyGuard,
  (req: Request, res: Response, next) => {
    upload.single("file")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return next(new AppError(413, "File too large (max 25 MB)", "FILE_TOO_LARGE"));
        }
        return next(new AppError(400, `Upload error: ${err.message}`, "VALIDATION_ERROR"));
      }
      if (err) return next(err);
      next();
    });
  },
  async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) {
      throw new AppError(400, "File is required", "VALIDATION_ERROR");
    }

    const { transaction_id, artifact_type } = req.body as {
      transaction_id?: string;
      artifact_type?: string;
    };

    if (!transaction_id || !UUID_RE.test(transaction_id)) {
      throw new AppError(400, "transaction_id must be a valid UUID", "VALIDATION_ERROR");
    }

    if (!artifact_type || !ALLOWED_TYPES.has(artifact_type)) {
      throw new AppError(400, `artifact_type must be one of: ${[...ALLOWED_TYPES].join(", ")}`, "VALIDATION_ERROR");
    }

    const { Readable } = await import("node:stream");
    const fileStream = Readable.from(file.buffer);

    const artifact = await uploadEvidence({
      transactionId: transaction_id,
      uploaderId: req.userId!,
      artifactType: artifact_type,
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileStream,
      forensic: req.forensic,
    });

    res.status(201).json({
      artifact_id: artifact.artifact_id,
      sha256: artifact.sha256_hash,
      created_at: artifact.created_at,
    });
  },
);

export default router;
