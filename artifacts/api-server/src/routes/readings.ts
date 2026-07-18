import { Router } from "express";
import { db } from "@workspace/db";
import { readingsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireUser } from "../lib/userMiddleware";

const router = Router();

// GET /api/readings
router.get("/readings", requireUser, async (req, res) => {
  const limit = Math.min(Number(req.query["limit"]) || 30, 100);
  const type = req.query["type"] as string | undefined;

  const rows = await db
    .select()
    .from(readingsTable)
    .where(
      type
        ? and(eq(readingsTable.userId, req.userId), eq(readingsTable.type, type))
        : eq(readingsTable.userId, req.userId),
    )
    .orderBy(desc(readingsTable.createdAt))
    .limit(limit);

  res.json({
    readings: rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      type: r.type,
      systolic: r.systolic !== null ? Number(r.systolic) : undefined,
      diastolic: r.diastolic !== null ? Number(r.diastolic) : undefined,
      value: r.value !== null ? Number(r.value) : undefined,
      note: r.note,
      createdAt: r.createdAt,
    })),
  });
});

// POST /api/readings
router.post("/readings", requireUser, async (req, res) => {
  const { type, systolic, diastolic, value, note } = req.body as {
    type: "bp" | "sugar" | "weight";
    systolic?: number;
    diastolic?: number;
    value?: number;
    note?: string;
  };

  if (!type || !["bp", "sugar", "weight"].includes(type)) {
    res.status(400).json({ error: "invalid_input", message: "type must be bp|sugar|weight" });
    return;
  }

  if (type === "bp" && (!systolic || !diastolic)) {
    res.status(400).json({ error: "invalid_input", message: "BP readings require systolic and diastolic" });
    return;
  }
  if (type !== "bp" && !value) {
    res.status(400).json({ error: "invalid_input", message: "value is required for this reading type" });
    return;
  }

  const inserted = await db
    .insert(readingsTable)
    .values({
      userId: req.userId,
      type,
      systolic: systolic !== undefined ? String(systolic) : null,
      diastolic: diastolic !== undefined ? String(diastolic) : null,
      value: value !== undefined ? String(value) : null,
      note: note ?? "",
    })
    .returning();

  const r = inserted[0]!;
  res.status(201).json({
    id: r.id,
    userId: r.userId,
    type: r.type,
    systolic: r.systolic !== null ? Number(r.systolic) : undefined,
    diastolic: r.diastolic !== null ? Number(r.diastolic) : undefined,
    value: r.value !== null ? Number(r.value) : undefined,
    note: r.note,
    createdAt: r.createdAt,
  });
});

export default router;
