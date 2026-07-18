import { Router } from "express";
import { db } from "@workspace/db";
import { medicationsTable, medicationLogsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireUser } from "../lib/userMiddleware";

const router = Router();

// GET /api/medications
router.get("/medications", requireUser, async (req, res) => {
  const meds = await db
    .select()
    .from(medicationsTable)
    .where(eq(medicationsTable.userId, req.userId))
    .orderBy(desc(medicationsTable.createdAt));

  res.json({
    medications: meds.map((m) => ({
      id: m.id,
      userId: m.userId,
      name: m.name,
      dose: m.dose,
      condition: m.condition,
      timesPerDay: m.timesPerDay,
      withFood: m.withFood,
      active: m.active,
      createdAt: m.createdAt,
    })),
  });
});

// POST /api/medications
router.post("/medications", requireUser, async (req, res) => {
  const { name, dose, condition, timesPerDay, withFood, active } = req.body as {
    name: string;
    dose: string;
    condition?: string;
    timesPerDay?: number;
    withFood?: boolean;
    active?: boolean;
  };

  if (!name || !dose) {
    res.status(400).json({ error: "invalid_input", message: "name and dose are required" });
    return;
  }

  const inserted = await db
    .insert(medicationsTable)
    .values({
      userId: req.userId,
      name,
      dose,
      condition: condition ?? "",
      timesPerDay: timesPerDay ?? 1,
      withFood: withFood ?? false,
      active: active !== undefined ? active : true,
    })
    .returning();

  const m = inserted[0]!;
  res.status(201).json({
    id: m.id,
    userId: m.userId,
    name: m.name,
    dose: m.dose,
    condition: m.condition,
    timesPerDay: m.timesPerDay,
    withFood: m.withFood,
    active: m.active,
    createdAt: m.createdAt,
  });
});

// PATCH /api/medications/:id
router.patch("/medications/:id", requireUser, async (req, res) => {
  const { id } = req.params as { id: string };
  const { name, dose, condition, timesPerDay, withFood, active } = req.body as {
    name?: string;
    dose?: string;
    condition?: string;
    timesPerDay?: number;
    withFood?: boolean;
    active?: boolean;
  };

  const updated = await db
    .update(medicationsTable)
    .set({
      ...(name !== undefined && { name }),
      ...(dose !== undefined && { dose }),
      ...(condition !== undefined && { condition }),
      ...(timesPerDay !== undefined && { timesPerDay }),
      ...(withFood !== undefined && { withFood }),
      ...(active !== undefined && { active }),
    })
    .where(and(eq(medicationsTable.id, id), eq(medicationsTable.userId, req.userId)))
    .returning();

  if (updated.length === 0) {
    res.status(404).json({ error: "not_found", message: "Medication not found" });
    return;
  }

  const m = updated[0]!;
  res.json({
    id: m.id,
    userId: m.userId,
    name: m.name,
    dose: m.dose,
    condition: m.condition,
    timesPerDay: m.timesPerDay,
    withFood: m.withFood,
    active: m.active,
    createdAt: m.createdAt,
  });
});

// DELETE /api/medications/:id
router.delete("/medications/:id", requireUser, async (req, res) => {
  const { id } = req.params as { id: string };

  await db
    .delete(medicationsTable)
    .where(and(eq(medicationsTable.id, id), eq(medicationsTable.userId, req.userId)));

  res.json({ success: true });
});

// POST /api/medications/:id/log
router.post("/medications/:id/log", requireUser, async (req, res) => {
  const { id } = req.params as { id: string };
  const { status, scheduledTime } = req.body as {
    status: "taken" | "missed" | "snoozed";
    scheduledTime?: string;
  };

  if (!["taken", "missed", "snoozed"].includes(status)) {
    res.status(400).json({ error: "invalid_input", message: "status must be taken|missed|snoozed" });
    return;
  }

  const inserted = await db
    .insert(medicationLogsTable)
    .values({
      medicationId: id,
      userId: req.userId,
      status,
      scheduledTime: scheduledTime ? new Date(scheduledTime) : null,
    })
    .returning();

  const log = inserted[0]!;
  res.status(201).json({
    id: log.id,
    medicationId: log.medicationId,
    userId: log.userId,
    status: log.status,
    scheduledTime: log.scheduledTime,
    loggedAt: log.loggedAt,
  });
});

// GET /api/medications/:id/log
router.get("/medications/:id/log", requireUser, async (req, res) => {
  const { id } = req.params as { id: string };

  const logs = await db
    .select()
    .from(medicationLogsTable)
    .where(
      and(eq(medicationLogsTable.medicationId, id), eq(medicationLogsTable.userId, req.userId)),
    )
    .orderBy(desc(medicationLogsTable.loggedAt))
    .limit(30);

  res.json({
    logs: logs.map((l) => ({
      id: l.id,
      medicationId: l.medicationId,
      userId: l.userId,
      status: l.status,
      scheduledTime: l.scheduledTime,
      loggedAt: l.loggedAt,
    })),
  });
});

export default router;
