import { Router } from "express";
import { db } from "@workspace/db";
import { creditUsageTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireUser, FREE_TIER_CREDITS } from "../lib/userMiddleware";

const router = Router();

// GET /api/credits
router.get("/credits", requireUser, async (req, res) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const all = await db
    .select()
    .from(creditUsageTable)
    .where(eq(creditUsageTable.userId, req.userId))
    .orderBy(desc(creditUsageTable.createdAt));

  const used = all.filter((r) => r.createdAt >= thirtyDaysAgo).length;
  const remaining = Math.max(0, FREE_TIER_CREDITS - used);
  const resetDate = new Date(thirtyDaysAgo.getTime() + 30 * 24 * 60 * 60 * 1000);

  res.json({
    used,
    limit: FREE_TIER_CREDITS,
    remaining,
    resetDate,
  });
});

export default router;
