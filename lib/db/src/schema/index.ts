import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  uuid,
  date,
  numeric,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ── Users (device-based, no password auth) ──────────────────────────────────
export const usersTable = pgTable("users", {
  id: text("id").primaryKey(), // device UUID
  tier: text("tier").default("free").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Medical Profiles ─────────────────────────────────────────────────────────
export const medicalProfilesTable = pgTable("medical_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").default("").notNull(),
  age: integer("age").notNull(),
  gender: text("gender").notNull(),
  weightKg: numeric("weight_kg").notNull(),
  conditions: text("conditions").array().notNull().default([]),
  medicationsText: text("medications_text").default("").notNull(),
  historyText: text("history_text").default("").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMedicalProfileSchema = createInsertSchema(medicalProfilesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMedicalProfile = z.infer<typeof insertMedicalProfileSchema>;
export type MedicalProfile = typeof medicalProfilesTable.$inferSelect;

// ── Medications ───────────────────────────────────────────────────────────────
export const medicationsTable = pgTable("medications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  dose: text("dose").notNull(),
  condition: text("condition").default("").notNull(),
  timesPerDay: integer("times_per_day").notNull().default(1),
  withFood: boolean("with_food").notNull().default(false),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMedicationSchema = createInsertSchema(medicationsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertMedication = z.infer<typeof insertMedicationSchema>;
export type Medication = typeof medicationsTable.$inferSelect;

// ── Medication Logs ───────────────────────────────────────────────────────────
export const medicationLogsTable = pgTable("medication_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  medicationId: uuid("medication_id")
    .notNull()
    .references(() => medicationsTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  status: text("status").notNull(), // taken | missed | snoozed
  scheduledTime: timestamp("scheduled_time"),
  loggedAt: timestamp("logged_at").defaultNow().notNull(),
});

export const insertMedicationLogSchema = createInsertSchema(medicationLogsTable).omit({
  id: true,
  loggedAt: true,
});
export type InsertMedicationLog = z.infer<typeof insertMedicationLogSchema>;
export type MedicationLog = typeof medicationLogsTable.$inferSelect;

// ── Symptom Logs ──────────────────────────────────────────────────────────────
export const symptomLogsTable = pgTable("symptom_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  inputText: text("input_text").notNull(),
  riskScore: integer("risk_score").notNull().default(0),
  tier: text("tier").notNull().default("home_care"),
  aiReason: text("ai_reason").notNull().default(""),
  advice: text("advice").array().notNull().default([]),
  isEmergency: boolean("is_emergency").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SymptomLog = typeof symptomLogsTable.$inferSelect;

// ── Readings (BP / sugar / weight) ───────────────────────────────────────────
export const readingsTable = pgTable("readings", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(), // bp | sugar | weight
  systolic: numeric("systolic"),
  diastolic: numeric("diastolic"),
  value: numeric("value"),
  note: text("note").default("").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Reading = typeof readingsTable.$inferSelect;

// ── Health Files ──────────────────────────────────────────────────────────────
export const healthFilesTable = pgTable("health_files", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  fileType: text("file_type").notNull(), // report | prescription
  filename: text("filename").notNull(),
  title: text("title").default("").notNull(),
  ocrSummary: text("ocr_summary").default("").notNull(),
  storageKey: text("storage_key").notNull(), // base64 stored inline for first build
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export type HealthFile = typeof healthFilesTable.$inferSelect;

// ── Credit Usage ──────────────────────────────────────────────────────────────
export const creditUsageTable = pgTable("credit_usage", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  feature: text("feature").notNull(), // symptom_analysis | daily_recommendation | report_summary
  tokensUsed: integer("tokens_used").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CreditUsage = typeof creditUsageTable.$inferSelect;

// ── Daily Recommendations (cached per user per day) ───────────────────────────
export const dailyRecommendationsTable = pgTable("daily_recommendations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  date: date("date").notNull(),
  recommendationJson: text("recommendation_json").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type DailyRecommendation = typeof dailyRecommendationsTable.$inferSelect;

export {};
