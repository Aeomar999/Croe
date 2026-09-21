import { Router, type Router as RouterType } from "express";
import type { Request, Response } from "express";
import { authenticate } from "../middleware/auth.js";
import { getTransactionClient } from "../db/pool.js";

const router: RouterType = Router();

/**
 * GET /users/me/preferences
 */
router.get("/users/me/preferences", authenticate, async (req: Request, res: Response) => {
  const client = await getTransactionClient();
  try {
    const { rows } = await client.query(
      `SELECT push_notifications_enabled, email_notifications_enabled, sms_notifications_enabled 
       FROM user_preferences WHERE user_id = $1`,
      [req.userId]
    );

    if (rows.length === 0) {
      // Return defaults if none exist
      res.status(200).json({
        push_notifications_enabled: true,
        email_notifications_enabled: true,
        sms_notifications_enabled: true,
      });
      return;
    }

    res.status(200).json(rows[0]);
  } finally {
    client.release();
  }
});

/**
 * PUT /users/me/preferences
 */
router.put("/users/me/preferences", authenticate, async (req: Request, res: Response) => {
  const { push_notifications_enabled, email_notifications_enabled, sms_notifications_enabled } = req.body;

  const push = typeof push_notifications_enabled === "boolean" ? push_notifications_enabled : true;
  const email = typeof email_notifications_enabled === "boolean" ? email_notifications_enabled : true;
  const sms = typeof sms_notifications_enabled === "boolean" ? sms_notifications_enabled : true;

  const client = await getTransactionClient();
  try {
    const { rows } = await client.query(
      `INSERT INTO user_preferences (user_id, push_notifications_enabled, email_notifications_enabled, sms_notifications_enabled)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO UPDATE SET
         push_notifications_enabled = EXCLUDED.push_notifications_enabled,
         email_notifications_enabled = EXCLUDED.email_notifications_enabled,
         sms_notifications_enabled = EXCLUDED.sms_notifications_enabled,
         updated_at = NOW()
       RETURNING push_notifications_enabled, email_notifications_enabled, sms_notifications_enabled`,
      [req.userId, push, email, sms]
    );

    res.status(200).json(rows[0]);
  } finally {
    client.release();
  }
});

export default router;
