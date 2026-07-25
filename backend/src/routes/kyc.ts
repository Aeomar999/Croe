import { Router, type Router as RouterType } from "express";
import type { Request, Response } from "express";
import multer from "multer";
import { authenticate } from "../middleware/auth.js";
import { submitKYC, getKYCStatus } from "../services/kyc.js";
import { AppError } from "../middleware/error-handler.js";

const router: RouterType = Router();

const VALID_ID_TYPES = new Set(["NATIONAL_ID", "PASSPORT", "VOTER_ID"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB — ID images
});

/**
 * POST /kyc/submit — Submit KYC identity document
 * Multipart: id_type (form field), id_image (file)
 * 09-KYC-and-AML.md §3 — manual review for P0
 */
router.post(
  "/kyc/submit",
  authenticate,
  (req: Request, res: Response, next) => {
    upload.single("id_image")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return next(new AppError(413, "ID image too large (max 10 MB)", "FILE_TOO_LARGE"));
        }
        return next(new AppError(400, `Upload error: ${err.message}`, "VALIDATION_ERROR"));
      }
      if (err) return next(err);
      next();
    });
  },
  async (req: Request, res: Response) => {
    if (!req.file) {
      throw new AppError(400, "id_image file is required", "VALIDATION_ERROR");
    }

    const { id_type } = req.body as { id_type?: string };

    if (!id_type || !VALID_ID_TYPES.has(id_type)) {
      throw new AppError(
        400,
        `id_type must be one of: ${[...VALID_ID_TYPES].join(", ")}`,
        "VALIDATION_ERROR",
      );
    }

    // P0: manual review — no id_number collected; service expects a string to hash.
    // Pass a placeholder; reviewer extracts the real number from the image.
    const { kycId } = await submitKYC(req.userId!, id_type, "P0_MANUAL_REVIEW");

    res.status(202).json({
      kyc_id: kycId,
      status: "PENDING",
    });
  },
);

/**
 * GET /kyc/status — Get current user's KYC tier and latest submission status
 */
router.get("/kyc/status", authenticate, async (req: Request, res: Response) => {
  const { tier, pendingSubmission } = await getKYCStatus(req.userId!);

  res.json({
    tier,
    status: pendingSubmission ? "PENDING" : "VERIFIED",
    kyc_id: pendingSubmission,
  });
});

export default router;
