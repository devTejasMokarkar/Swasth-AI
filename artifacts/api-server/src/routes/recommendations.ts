import { Router } from "express";
import { db } from "@workspace/db";
import {
  dailyRecommendationsTable,
  medicalProfilesTable,
  readingsTable,
  symptomLogsTable,
  creditUsageTable,
} from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireUser, FREE_TIER_CREDITS } from "../lib/userMiddleware";
import { generateDailyRecommendation, calculateDefaultWaterGoal } from "../lib/cohere";

const router = Router();
const DAILY_RECOMMENDATION_CREDIT_COST = 1;
const DAILY_AI_TIP_CREDIT_COST = 1;
const DAILY_RECOMMENDATION_TOTAL_COST =
  DAILY_RECOMMENDATION_CREDIT_COST + DAILY_AI_TIP_CREDIT_COST;

// GET /api/daily-recommendation — cached per user per day
router.get("/daily-recommendation", requireUser, async (req, res) => {
  const today = new Date().toISOString().split("T")[0]!; // YYYY-MM-DD

  // Check cache
  const cached = await db
    .select()
    .from(dailyRecommendationsTable)
    .where(
      and(
        eq(dailyRecommendationsTable.userId, req.userId),
        eq(dailyRecommendationsTable.date, today),
      ),
    )
    .limit(1);

  if (cached.length > 0) {
    const rec = JSON.parse(cached[0]!.recommendationJson);
    res.json({
      id: cached[0]!.id,
      userId: req.userId,
      date: today,
      healthScore: rec.health_score,
      greeting: rec.greeting,
      fruitSuggestion: rec.fruit_suggestion,
      waterGoalLiters: rec.water_goal_liters,
      sleepTargetHours: rec.sleep_target_hours,
      exerciseSuggestion: rec.exercise_suggestion,
      personalizedTip: rec.personalized_tip,
      dietPlan: rec.diet_plan,
      warnings: rec.warnings,
      creditCost: {
        recommendation: 0,
        aiTip: 0,
        total: 0,
      },
      cached: true,
      createdAt: cached[0]!.createdAt,
    });
    return;
  }

  // Check credits. A fresh daily recommendation charges one credit, and the AI tip attached
  // to that recommendation charges one additional credit.
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const usageRows = await db
    .select()
    .from(creditUsageTable)
    .where(eq(creditUsageTable.userId, req.userId));
  const used = usageRows.filter((r) => r.createdAt >= thirtyDaysAgo).length;

  if (used + DAILY_RECOMMENDATION_TOTAL_COST > FREE_TIER_CREDITS) {
    res.status(402).json({
      error: "insufficient_credits",
      message:
        "You've used all your AI credits this month. The daily recommendation and AI tip cost 2 credits total.",
    });
    return;
  }

  // Fetch profile
  const profileRows = await db
    .select()
    .from(medicalProfilesTable)
    .where(eq(medicalProfilesTable.userId, req.userId))
    .limit(1);
  const profile = profileRows[0] ?? null;

  // Build recent context
  const recentReadings = await db
    .select()
    .from(readingsTable)
    .where(eq(readingsTable.userId, req.userId))
    .orderBy(desc(readingsTable.createdAt))
    .limit(5);

  const recentSymptoms = await db
    .select()
    .from(symptomLogsTable)
    .where(eq(symptomLogsTable.userId, req.userId))
    .orderBy(desc(symptomLogsTable.createdAt))
    .limit(3);

  let recentContext = "";
  if (recentReadings.length > 0) {
    recentContext += "Recent readings: " + recentReadings.map((r) => {
      if (r.type === "bp") return `BP ${r.systolic}/${r.diastolic} mmHg`;
      if (r.type === "sugar") return `Blood sugar ${r.value} mg/dL`;
      if (r.type === "weight") return `Weight ${r.value} kg`;
      return "";
    }).join(", ") + ". ";
  }
  if (recentSymptoms.length > 0) {
    recentContext += "Recent symptoms: " + recentSymptoms.map((s) => `"${s.inputText}" (${s.tier})`).join("; ") + ".";
  }

  // Generate recommendation
  let result;
  let tokensUsed = 0;
  let creditCost = {
    recommendation: 0,
    aiTip: 0,
    total: 0,
  };

  try {
    const apiProfile = profile
      ? {
          age: profile.age,
          gender: profile.gender,
          weightKg: Number(profile.weightKg),
          conditions: profile.conditions,
          medicationsText: profile.medicationsText,
        }
      : null;

    const out = await generateDailyRecommendation(
      apiProfile,
      recentContext,
    );
    result = out.result;
    tokensUsed = out.tokensUsed;
    creditCost = {
      recommendation: DAILY_RECOMMENDATION_CREDIT_COST,
      aiTip: DAILY_AI_TIP_CREDIT_COST,
      total: DAILY_RECOMMENDATION_TOTAL_COST,
    };
  } catch (err) {
    // Fallback recommendation — don't charge a credit
    result = {
      health_score: 75,
      greeting: "Good day! Stay consistent with your health routine today.",
      fruit_suggestion: "Banana — great source of potassium and natural energy.",
      water_goal_liters: calculateDefaultWaterGoal(
        profile
          ? {
              age: profile.age,
              gender: profile.gender,
              weightKg: Number(profile.weightKg),
              conditions: profile.conditions,
            }
          : null,
      ),
      sleep_target_hours: 7.5,
      exercise_suggestion: "A 20-minute walk in fresh air will do wonders for your health today.",
      personalized_tip: "Log your medications and readings consistently for better AI personalization.",
      diet_plan: [
        {
          food: "Apple",
          timing: "midday",
          benefit: "Fibre helps steady blood sugar",
          image_prompt: "A crisp red apple on a bright kitchen counter, healthy and fresh",
        },
        {
          food: "Papaya",
          timing: "dinner",
          benefit: "Gentle on digestion and easy to include in a kidney-friendly plan",
          image_prompt: "A bowl of ripe papaya slices with soft natural lighting, fresh and calming",
        },
        {
          food: "Almonds",
          timing: "morning",
          benefit: "Supports steady energy and a satisfying start to the day",
          image_prompt: "A small handful of almonds in a ceramic bowl with warm morning light",
        },
      ],
      warnings: [] as string[],
    };
  }

  // Log credit usage only if the AI request succeeded.
  if (tokensUsed > 0) {
    await db.insert(creditUsageTable).values({
      userId: req.userId,
      feature: "daily_recommendation",
      tokensUsed,
    });
    await db.insert(creditUsageTable).values({
      userId: req.userId,
      feature: "daily_ai_tip",
      tokensUsed: 0,
    });
  }

  // Cache recommendation
  const inserted = await db
    .insert(dailyRecommendationsTable)
    .values({
      userId: req.userId,
      date: today,
      recommendationJson: JSON.stringify(result),
    })
    .returning();

  const rec = inserted[0]!;
  res.json({
    id: rec.id,
    userId: req.userId,
    date: today,
    healthScore: result.health_score,
    greeting: result.greeting,
    fruitSuggestion: result.fruit_suggestion,
    waterGoalLiters: result.water_goal_liters,
    sleepTargetHours: result.sleep_target_hours,
    exerciseSuggestion: result.exercise_suggestion,
    personalizedTip: result.personalized_tip,
    dietPlan: result.diet_plan,
    warnings: result.warnings,
    creditCost,
    cached: false,
    createdAt: rec.createdAt,
  });
});

export default router;
