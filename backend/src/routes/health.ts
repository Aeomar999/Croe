import { Router, type Router as RouterType } from "express";
import { pool } from "../db/pool.js";

const router: RouterType = Router();

router.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (err) {
    res.status(503).json({
      status: "error",
      message: "Database unreachable",
    });
  }
});

export default router;
