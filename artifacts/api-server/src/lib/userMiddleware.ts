import { type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

declare global {
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}

/**
 * Extracts userId from Authorization: Bearer <userId> header.
 * Auto-creates the user record if this is the first request from this device.
 */
export async function requireUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const auth = req.headers.authorization;
  const userId = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;

  if (!userId || userId.length < 8) {
    res.status(401).json({ error: "unauthorized", message: "Missing user ID" });
    return;
  }

  // Auto-upsert user record (device registration)
  try {
    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(usersTable).values({ id: userId });
    }
  } catch (err) {
    req.log.error({ err }, "Failed to upsert user");
    res.status(500).json({ error: "internal_error", message: "Server error" });
    return;
  }

  req.userId = userId;
  next();
}

/**
 * Get number of AI credits used in the last 30 days for a user.
 * Free tier: 100 credits/month
 */
export const FREE_TIER_CREDITS = 100;
