import { db } from "@/lib/db";

/**
 * Generates an OAF Nigeria unique farmer ID.
 * Format: OAF-NG-YYYY-XXXXX (e.g., OAF-NG-2026-K9M2P)
 */
export async function generateUniqueFarmerId(): Promise<string> {
  const year = new Date().getFullYear();
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed confusing chars like 0/O, 1/I

  let attempts = 0;
  while (attempts < 10) {
    let suffix = "";
    for (let i = 0; i < 5; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const candidateId = `OAF-NG-${year}-${suffix}`;

    // Verify uniqueness in local Dexie database
    const existing = await db.farmers.get(candidateId);
    if (!existing) {
      return candidateId;
    }
    attempts++;
  }

  // Fallback with timestamp guarantee
  return `OAF-NG-${year}-${Date.now().toString(36).toUpperCase().slice(-5)}`;
}
