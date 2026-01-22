"use server";

import { db, leads, people, leadScores } from "@/db";
import { inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/**
 * Delete multiple leads and their associated data
 */
export async function deleteLeads(leadIds: number[]) {
  if (leadIds.length === 0) return { deleted: 0 };

  // Delete associated people first
  await db.delete(people).where(inArray(people.leadId, leadIds));

  // Delete associated scores
  await db.delete(leadScores).where(inArray(leadScores.leadId, leadIds));

  // Delete the leads
  await db.delete(leads).where(inArray(leads.id, leadIds));

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
