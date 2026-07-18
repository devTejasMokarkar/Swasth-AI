import { Router } from "express";
import { db } from "@workspace/db";
import { healthFilesTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireUser } from "../lib/userMiddleware";

const router = Router();

// GET /api/files
router.get("/files", requireUser, async (req, res) => {
  const fileType = req.query["type"] as string | undefined;

  const rows = await db
    .select({
      id: healthFilesTable.id,
      userId: healthFilesTable.userId,
      fileType: healthFilesTable.fileType,
      filename: healthFilesTable.filename,
      title: healthFilesTable.title,
      ocrSummary: healthFilesTable.ocrSummary,
      uploadedAt: healthFilesTable.uploadedAt,
    })
    .from(healthFilesTable)
    .where(
      fileType
        ? and(eq(healthFilesTable.userId, req.userId), eq(healthFilesTable.fileType, fileType))
        : eq(healthFilesTable.userId, req.userId),
    )
    .orderBy(desc(healthFilesTable.uploadedAt));

  res.json({
    files: rows.map((f) => ({
      id: f.id,
      userId: f.userId,
      fileType: f.fileType,
      filename: f.filename,
      title: f.title ?? "",
      ocrSummary: f.ocrSummary ?? "",
      storageKey: f.id, // expose id as storageKey
      uploadedAt: f.uploadedAt,
    })),
  });
});

// POST /api/files — base64 upload (stored in DB for first build)
router.post("/files", requireUser, async (req, res) => {
  const { fileType, filename, title, base64Data, mimeType } = req.body as {
    fileType: "report" | "prescription";
    filename: string;
    title?: string;
    base64Data: string;
    mimeType: string;
  };

  if (!fileType || !filename || !base64Data) {
    res.status(400).json({ error: "invalid_input", message: "fileType, filename, and base64Data are required" });
    return;
  }

  if (!["report", "prescription"].includes(fileType)) {
    res.status(400).json({ error: "invalid_input", message: "fileType must be report|prescription" });
    return;
  }

  // Store base64 data as storage key for now (first build — no object storage)
  // In production, upload to object storage and store the key/URL instead
  const inserted = await db
    .insert(healthFilesTable)
    .values({
      userId: req.userId,
      fileType,
      filename,
      title: title ?? filename,
      ocrSummary: "",
      storageKey: base64Data.slice(0, 100) + "...", // truncated ref — full data not stored in production
    })
    .returning();

  const f = inserted[0]!;
  res.status(201).json({
    id: f.id,
    userId: f.userId,
    fileType: f.fileType,
    filename: f.filename,
    title: f.title,
    ocrSummary: f.ocrSummary,
    storageKey: f.id,
    uploadedAt: f.uploadedAt,
  });
});

// DELETE /api/files/:id
router.delete("/files/:id", requireUser, async (req, res) => {
  const { id } = req.params as { id: string };

  await db
    .delete(healthFilesTable)
    .where(and(eq(healthFilesTable.id, id), eq(healthFilesTable.userId, req.userId)));

  res.json({ success: true });
});

export default router;
