import { Router } from "express";
import { db } from "@workspace/db";
import { medicalProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireUser } from "../lib/userMiddleware";

const router = Router();

// GET /api/profile
router.get("/profile", requireUser, async (req, res) => {
  const profile = await db
    .select()
    .from(medicalProfilesTable)
    .where(eq(medicalProfilesTable.userId, req.userId))
    .limit(1);

  if (profile.length === 0) {
    res.status(404).json({ error: "not_found", message: "Profile not found" });
    return;
  }

  const p = profile[0]!;
  res.json({
    id: p.id,
    userId: p.userId,
    name: p.name,
    age: p.age,
    gender: p.gender,
    weightKg: Number(p.weightKg),
    conditions: p.conditions,
    medicationsText: p.medicationsText,
    historyText: p.historyText,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  });
});

// POST /api/profile — create or update
router.post("/profile", requireUser, async (req, res) => {
  const { name, age, gender, weightKg, conditions, medicationsText, historyText } = req.body as {
    name?: string;
    age: number;
    gender: string;
    weightKg: number;
    conditions: string[];
    medicationsText?: string;
    historyText?: string;
  };

  if (
    typeof age !== "number" ||
    !Number.isFinite(age) ||
    age < 1 ||
    age > 120 ||
    typeof gender !== "string" ||
    !gender.trim() ||
    typeof weightKg !== "number" ||
    !Number.isFinite(weightKg) ||
    weightKg <= 0 ||
    !Array.isArray(conditions) ||
    conditions.length === 0
  ) {
    res.status(400).json({
      error: "invalid_input",
      message: "Please provide a valid age, gender, weight, and at least one condition selection.",
    });
    return;
  }

  try {
    const existing = await db
      .select({ id: medicalProfilesTable.id, name: medicalProfilesTable.name })
      .from(medicalProfilesTable)
      .where(eq(medicalProfilesTable.userId, req.userId))
      .limit(1);

    let profile;
    if (existing.length > 0) {
      const updated = await db
        .update(medicalProfilesTable)
        .set({
          name: name?.trim() ?? existing[0]!.name,
          age,
          gender: gender.trim(),
          weightKg: String(weightKg),
          conditions,
          medicationsText: medicationsText ?? "",
          historyText: historyText ?? "",
          updatedAt: new Date(),
        })
        .where(eq(medicalProfilesTable.userId, req.userId))
        .returning();
      profile = updated[0]!;
    } else {
      const inserted = await db
        .insert(medicalProfilesTable)
        .values({
          userId: req.userId,
          name: name?.trim() ?? "",
          age,
          gender: gender.trim(),
          weightKg: String(weightKg),
          conditions,
          medicationsText: medicationsText ?? "",
          historyText: historyText ?? "",
        })
        .returning();
      profile = inserted[0]!;
    }

    res.json({
      id: profile.id,
      userId: profile.userId,
      name: profile.name,
      age: profile.age,
      gender: profile.gender,
      weightKg: Number(profile.weightKg),
      conditions: profile.conditions,
      medicationsText: profile.medicationsText,
      historyText: profile.historyText,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to save profile");
    res.status(500).json({
      error: "internal_error",
      message: "Could not save your profile right now. Please try again.",
    });
  }
});

export default router;
