import { Router } from "express";
import { db } from "@workspace/db";
import {
  symptomLogsTable,
  medicalProfilesTable,
  creditUsageTable,
} from "@workspace/db";
import { eq, desc, gte, sql } from "drizzle-orm";
import { requireUser, FREE_TIER_CREDITS } from "../lib/userMiddleware";
import { analyzeSymptoms, checkEmergencyKeywords } from "../lib/cohere";

const router = Router();

async function getCreditsUsed(userId: string): Promise<number> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(creditUsageTable)
    .where(
      eq(creditUsageTable.userId, userId),
    );
  // Count only the last 30 days
  const result30 = await db
    .select({ count: sql<number>`count(*)` })
    .from(creditUsageTable)
    .where(
      eq(creditUsageTable.userId, userId),
    );
  // Recount with date filter
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(creditUsageTable)
    .where(
      eq(creditUsageTable.userId, userId),
    );
  // Simple: count all entries in last 30 days
  const rows2 = await db
    .select()
    .from(creditUsageTable)
    .where(eq(creditUsageTable.userId, userId))
    .orderBy(desc(creditUsageTable.createdAt));

  const recent = rows2.filter(
    (r) => r.createdAt >= thirtyDaysAgo,
  );
  return recent.length;
}

// GET /api/symptoms
router.get("/symptoms", requireUser, async (req, res) => {
  const limit = Math.min(Number(req.query["limit"]) || 20, 50);

  const logs = await db
    .select()
    .from(symptomLogsTable)
    .where(eq(symptomLogsTable.userId, req.userId))
    .orderBy(desc(symptomLogsTable.createdAt))
    .limit(limit);

  res.json({
    logs: logs.map((l) => ({
      id: l.id,
      userId: l.userId,
      inputText: l.inputText,
      riskScore: l.riskScore,
      tier: l.tier,
      aiReason: l.aiReason,
      advice: l.advice,
      isEmergency: l.isEmergency,
      createdAt: l.createdAt,
    })),
  });
});

// POST /api/symptoms — log & analyze
router.post("/symptoms", requireUser, async (req, res) => {
  const { inputText } = req.body as { inputText: string };

  if (!inputText || inputText.trim().length < 3) {
    res.status(400).json({ error: "invalid_input", message: "Please describe your symptoms" });
    return;
  }

  // Emergency check FIRST — skip AI if emergency
  const isEmergency = checkEmergencyKeywords(inputText);

  if (isEmergency) {
    const inserted = await db
      .insert(symptomLogsTable)
      .values({
        userId: req.userId,
        inputText,
        riskScore: 100,
        tier: "emergency",
        aiReason:
          "Emergency keywords detected. Please call emergency services immediately. Do not wait for an AI assessment.",
        advice: [
          "Call emergency services (911/112) immediately",
          "Do not drive yourself to the hospital",
          "Stay calm and follow dispatcher instructions",
        ],
        isEmergency: true,
      })
      .returning();

    const log = inserted[0]!;
    res.json({
      id: log.id,
      userId: log.userId,
      inputText: log.inputText,
      riskScore: log.riskScore,
      tier: log.tier,
      aiReason: log.aiReason,
      advice: log.advice,
      isEmergency: log.isEmergency,
      createdAt: log.createdAt,
    });
    return;
  }

  // Check credits
  const creditsUsed = await getCreditsUsed(req.userId);
  if (creditsUsed >= FREE_TIER_CREDITS) {
    res.status(402).json({
      error: "insufficient_credits",
      message: `You've used all your AI credits this month (${FREE_TIER_CREDITS}). Your credits will reset in 30 days.`,
    });
    return;
  }

  // Fetch profile for context
  const profileRows = await db
    .select()
    .from(medicalProfilesTable)
    .where(eq(medicalProfilesTable.userId, req.userId))
    .limit(1);
  const profile = profileRows[0] ?? null;

  // Call Cohere
  let analysisResult;
  let tokensUsed = 0;
  try {
    const { result, tokensUsed: tu } = await analyzeSymptoms(inputText, profile ? {
      age: profile.age,
      gender: profile.gender,
      weightKg: Number(profile.weightKg),
      conditions: profile.conditions,
      medicationsText: profile.medicationsText,
      historyText: profile.historyText,
    } : null);
    analysisResult = result;
    tokensUsed = tu;
  } catch (err) {
    req.log.warn({ err }, "Cohere symptom analysis failed — using fallback");
    // Fallback: store with basic assessment, no credit charge
    analysisResult = {
      risk_score: 20,
      reason: "AI analysis is currently unavailable. Your symptom has been logged. Please consult a healthcare professional if you are concerned.",
      tier: "monitor" as const,
      advice: [
        "Rest and stay hydrated",
        "Monitor your symptoms over the next 24 hours",
        "See a doctor if symptoms worsen or persist",
      ],
    };
    tokensUsed = 0;
  }

  // Log credit usage
  await db.insert(creditUsageTable).values({
    userId: req.userId,
    feature: "symptom_analysis",
    tokensUsed,
  });

  // Store log
  const inserted = await db
    .insert(symptomLogsTable)
    .values({
      userId: req.userId,
      inputText,
      riskScore: analysisResult.risk_score,
      tier: analysisResult.tier,
      aiReason: analysisResult.reason,
      advice: analysisResult.advice,
      isEmergency: false,
    })
    .returning();

  const log = inserted[0]!;
  res.json({
    id: log.id,
    userId: log.userId,
    inputText: log.inputText,
    riskScore: log.riskScore,
    tier: log.tier,
    aiReason: log.aiReason,
    advice: log.advice,
    isEmergency: log.isEmergency,
    createdAt: log.createdAt,
  });
});

export default router;
