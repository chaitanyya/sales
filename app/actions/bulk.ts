"use server";

import { db, leads, people, leadScores } from "@/db";
import { inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/**
 * Delete multiple leads and their associated data
 * Uses a transaction to ensure atomicity - if any delete fails, all are rolled back
 */
export async function deleteLeads(leadIds: number[]) {
  if (leadIds.length === 0) return { deleted: 0 };

  // Use transaction to ensure atomicity - prevents orphaned data if any delete fails
  await db.transaction(async (tx) => {
    // Delete associated people first
    await tx.delete(people).where(inArray(people.leadId, leadIds));

    // Delete associated scores
    await tx.delete(leadScores).where(inArray(leadScores.leadId, leadIds));

    // Delete the leads
    await tx.delete(leads).where(inArray(leads.id, leadIds));
  });

  revalidatePath("/lead");
  revalidatePath("/people");
  revalidatePath("/scoring");

  return { deleted: leadIds.length };
}

/**
 * Delete multiple people
 */
export async function deletePeople(personIds: number[]) {
  if (personIds.length === 0) return { deleted: 0 };

  await db.delete(people).where(inArray(people.id, personIds));

  revalidatePath("/people");
  revalidatePath("/lead");

  return { deleted: personIds.length };
}
