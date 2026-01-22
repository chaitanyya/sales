"use server";

import { db, leads, people } from "@/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { LeadUserStatusType, PersonUserStatusType } from "@/lib/constants/status-config";

export async function updateLeadUserStatus(leadId: number, status: LeadUserStatusType) {
  await db.update(leads).set({ userStatus: status }).where(eq(leads.id, leadId));

  revalidatePath("/lead");
  revalidatePath(`/lead/${leadId}`);
}

export async function updatePersonUserStatus(personId: number, status: PersonUserStatusType) {
  await db.update(people).set({ userStatus: status }).where(eq(people.id, personId));

  revalidatePath("/people");
  revalidatePath(`/people/${personId}`);
}
