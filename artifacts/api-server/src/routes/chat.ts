import { Router } from "express";
import { db } from "@workspace/db";
import { creditUsageTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { requireUser, FREE_TIER_CREDITS } from "../lib/userMiddleware";
import { callCohere } from "../lib/cohere";

const router = Router();

async function getCreditsUsed(userId: string): Promise<number> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const rows = await db
    .select()
    .from(creditUsageTable)
    .where(eq(creditUsageTable.userId, userId))
    .orderBy(desc(creditUsageTable.createdAt));

  const recent = rows.filter((r) => r.createdAt >= thirtyDaysAgo);
  return recent.length;
}

// POST /api/chat — proxy to Cohere for conversational assistant (Swasthai)
router.post("/chat", requireUser, async (req, res) => {
  const { message } = req.body as { message?: string };
  if (!message || String(message).trim().length < 1) {
    res.status(400).json({ error: "invalid_input", message: "Message is required" });
    return;
  }

  // Check credits
  const used = await getCreditsUsed(req.userId);
  if (used >= FREE_TIER_CREDITS) {
    res.status(402).json({ error: "insufficient_credits", message: "You've used all your AI credits this month." });
    return;
  }

  // Build a simple system prompt for the Swasthai assistant
  const systemPrompt = `You are Swasthai, a friendly and evidence-based health assistant. Answer user questions concisely, avoid medical diagnosis language, and when appropriate suggest actionable next steps. Respond in plain text only.`;

  try {
    const { text, tokensUsed } = await callCohere(systemPrompt, String(message));

    // Log credit usage
    await db.insert(creditUsageTable).values({
      userId: req.userId,
      feature: "chat",
      tokensUsed: Math.max(0, Math.floor(tokensUsed ?? 0)),
    });

    res.json({ reply: text, tokensUsed });
  } catch (err: any) {
    req.log.error({ err }, "Chat proxy failed");
    res.status(503).json({ error: "service_unavailable", message: "Chat service unavailable" });
  }
});

export default router;
