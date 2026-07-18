import { logger } from "./logger";

const COHERE_API_KEY = process.env["COHERE_API_KEY"];
const COHERE_MODEL = process.env["COHERE_MODEL"] || "command-r-plus";
const COHERE_CHAT_URL = "https://api.cohere.com/v2/chat";
const MAX_OUTPUT_TOKENS = 500;

// Emergency keywords — checked BEFORE calling AI
const EMERGENCY_KEYWORDS = [
  "chest pain",
  "heart attack",
  "can't breathe",
  "cannot breathe",
  "breathing difficulty",
  "shortness of breath",
  "trouble breathing",
  "stroke",
  "facial droop",
  "arm numb",
  "loss of consciousness",
  "unconscious",
  "fainted",
  "passed out",
  "suicidal",
  "want to die",
  "kill myself",
  "end my life",
  "severe allergic",
  "anaphylaxis",
  "throat closing",
  "throat swelling",
  "severe bleeding",
  "uncontrolled bleeding",
  "coughing blood",
  "vomiting blood",
  "seizure",
  "convulsion",
  "collapse",
];

export function checkEmergencyKeywords(text: string): boolean {
  const lower = text.toLowerCase();
  return EMERGENCY_KEYWORDS.some((kw) => lower.includes(kw));
}

interface CohereMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface CohereResponse {
  message: {
    content: Array<{ type: string; text: string }>;
  };
  usage?: {
    billed_units?: { input_tokens?: number; output_tokens?: number };
  };
}

interface CohereCallResult {
  text: string;
  tokensUsed: number;
}

export async function callCohere(
  systemPrompt: string,
  userMessage: string,
): Promise<CohereCallResult> {
  if (!COHERE_API_KEY) {
    throw new Error("COHERE_API_KEY is not configured");
  }

  const messages: CohereMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];

  const body = {
    model: COHERE_MODEL,
    messages,
    max_tokens: MAX_OUTPUT_TOKENS,
  };

  const response = await fetch(COHERE_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${COHERE_API_KEY}`,
      "Content-Type": "application/json",
      "X-Client-Name": "ai-health-companion",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    logger.error({ status: response.status, body: errText }, "Cohere API error");
    throw new Error(`Cohere API error: ${response.status}`);
  }

  const data = (await response.json()) as CohereResponse;
  const text = data.message?.content?.find((c) => c.type === "text")?.text ?? "";
  const tokensUsed =
    (data.usage?.billed_units?.input_tokens ?? 0) +
    (data.usage?.billed_units?.output_tokens ?? 0);

  return { text, tokensUsed };
}

export interface SymptomAnalysisResult {
  risk_score: number;
  reason: string;
  tier: "home_care" | "monitor" | "see_doctor_24h" | "emergency";
  advice: string[];
}

export async function analyzeSymptoms(
  symptoms: string,
  profile: {
    age: number;
    gender: string;
    weightKg: number;
    conditions: string[];
    medicationsText: string;
    historyText: string;
  } | null,
): Promise<{ result: SymptomAnalysisResult; tokensUsed: number }> {
  const profileContext = profile
    ? `
- Age: ${profile.age}
- Gender: ${profile.gender}
- Weight: ${profile.weightKg}kg
- Known conditions: ${profile.conditions.length ? profile.conditions.join(", ") : "none"}
- Current medications: ${profile.medicationsText || "none listed"}
- Medical history / allergies: ${profile.historyText || "none listed"}`
    : "- Profile not provided";

  const systemPrompt = `You are a cautious, evidence-based health assistant AI. Your role is to assess symptoms and provide a triage recommendation. 

STRICT RULES:
1. Only reason from the symptoms and profile provided — never invent findings.
2. NEVER give a definitive diagnosis. Use phrasing like "commonly associated with", "may suggest", "could indicate".
3. Every response must carry the implicit understanding: "This is not a medical diagnosis. If in doubt, consult a doctor."
4. Respond ONLY with valid JSON — no markdown fences, no extra text.

User Medical Profile:${profileContext}

Respond with this exact JSON (no extra fields):
{
  "risk_score": <integer 0-100>,
  "reason": "<plain-language explanation, 2-3 sentences, no diagnosis>",
  "tier": "<exactly one of: home_care | monitor | see_doctor_24h | emergency>",
  "advice": ["<actionable tip 1>", "<actionable tip 2>", "<actionable tip 3>"]
}`;

  const { text, tokensUsed } = await callCohere(systemPrompt, `My symptoms: ${symptoms}`);

  let result: SymptomAnalysisResult;
  try {
    const cleaned = text.replace(/```json\n?|```\n?/g, "").trim();
    result = JSON.parse(cleaned) as SymptomAnalysisResult;
    // Clamp score
    result.risk_score = Math.min(100, Math.max(0, result.risk_score));
  } catch {
    logger.error({ text }, "Failed to parse Cohere symptom response");
    result = {
      risk_score: 30,
      reason:
        "Unable to parse AI response. Please describe your symptoms again with more detail.",
      tier: "monitor",
      advice: ["Rest and stay hydrated", "Monitor symptoms", "See a doctor if symptoms worsen"],
    };
  }

  return { result, tokensUsed };
}

export interface DailyRecommendationResult {
  health_score: number;
  greeting: string;
  fruit_suggestion: string;
  water_goal_liters: number;
  sleep_target_hours: number;
  exercise_suggestion: string;
  personalized_tip: string;
  diet_plan: Array<{
    food: string;
    timing: string;
    benefit: string;
    image_prompt: string;
  }>;
  warnings: string[];
}

export function calculateDefaultWaterGoal(profile: { age: number; gender: string; weightKg: number; conditions: string[] } | null): number {
  if (!profile) return 2.0;

  let target = profile.weightKg * 0.035;

  if (profile.age >= 60) {
    target *= 0.95;
  }
  if (profile.gender === "male") {
    target *= 1.05;
  }
  if (profile.conditions.some((condition) => /diabetes|blood_pressure|hypertension|thyroid/i.test(condition))) {
    target *= 1.05;
  }

  return Math.round(Math.max(1.5, Math.min(4.0, target)) * 10) / 10;
}

export async function generateDailyRecommendation(
  profile: {
    age: number;
    gender: string;
    weightKg: number;
    conditions: string[];
    medicationsText?: string;
    historyText?: string;
  } | null,
  recentContext: string,
): Promise<{ result: DailyRecommendationResult; tokensUsed: number }> {
  const profileContext = profile
    ? `
- Age: ${profile.age}
- Gender: ${profile.gender}
- Weight: ${profile.weightKg}kg
- Known conditions: ${profile.conditions.length ? profile.conditions.join(", ") : "none"}
- Medications: ${profile.medicationsText || "none"}
- Medical history / allergies: ${profile.historyText || "none"}`
    : "- No profile set up yet";

  const systemPrompt = `You are a warm, supportive daily health companion AI. Generate a personalized daily health recommendation.

User Profile:${profileContext}
Recent context: ${recentContext || "No recent readings or symptom logs."}

Rules:
1. Be warm and specific — not generic.
2. Tailor suggestions to their age, gender, weight, conditions, and recent logs.
3. Use a personalized water goal based on weight and health conditions, not a fixed number.
4. If the user has diabetes, hypertension, or blood pressure concerns, make hydration advice slightly more specific.
5. Include a compact diet plan with exactly 3 foods, each with a timing, a short benefit, and an image prompt.
6. Avoid suggesting foods that conflict with the profile, medications, recent readings, or medical history.
7. If the profile or history mentions kidney stones, avoid spinach, beetroot, and other high-oxalate foods.
8. Respond ONLY with valid JSON — no markdown, no extra text.

JSON schema (no extra fields):
{
  "health_score": <integer 0-100>,
  "greeting": "<one warm personalized sentence for today>",
  "fruit_suggestion": "<one specific food suggestion with brief why>",
  "water_goal_liters": <number like 2.5>,
  "sleep_target_hours": <number like 7.5>,
  "exercise_suggestion": "<specific exercise suited to their profile, 1-2 sentences>",
  "personalized_tip": "<one key health tip directly tied to their conditions or recent readings>",
  "diet_plan": [
    {"food": "<food>", "timing": "<when to eat>", "benefit": "<brief benefit>", "image_prompt": "<short prompt for an appetizing food image>"},
    {"food": "<food>", "timing": "<when to eat>", "benefit": "<brief benefit>", "image_prompt": "<short prompt for an appetizing food image>"},
    {"food": "<food>", "timing": "<when to eat>", "benefit": "<brief benefit>", "image_prompt": "<short prompt for an appetizing food image>"}
  ],
  "warnings": ["<warning if any readings are concerning, else empty array>"]
}`;

  const { text, tokensUsed } = await callCohere(
    systemPrompt,
    "Generate my daily health recommendation.",
  );

  let result: DailyRecommendationResult;
  try {
    const cleaned = text.replace(/```json\n?|```\n?/g, "").trim();
    result = JSON.parse(cleaned) as DailyRecommendationResult;
    result.health_score = Math.min(100, Math.max(0, result.health_score));
    result.diet_plan = Array.isArray(result.diet_plan) ? result.diet_plan.slice(0, 3) : [];
    while (result.diet_plan.length < 3) {
      result.diet_plan.push({
        food: "Hydrating snack",
        timing: "anytime",
        benefit: "Supports steady energy and hydration",
        image_prompt: "Minimal appetizing illustration of a healthy hydrating snack on a clean plate",
      });
    }
  } catch {
    logger.error({ text }, "Failed to parse Cohere recommendation response");
    result = {
      health_score: 70,
      greeting: "Good day! Here's your daily health check-in.",
      fruit_suggestion: "Apple — rich in fiber and antioxidants for heart health.",
      water_goal_liters: calculateDefaultWaterGoal(profile),
      sleep_target_hours: 7.5,
      exercise_suggestion: "A 20-minute brisk walk today will boost circulation and mood.",
      personalized_tip: "Stay consistent with your medications and log your readings regularly.",
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
      warnings: [],
    };
  }

  return { result, tokensUsed };
}
