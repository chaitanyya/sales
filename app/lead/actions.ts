"use server";

import { insertLead } from "@/lib/db/queries";
import { revalidatePath } from "next/cache";

export async function addLead(data: {
  companyName: string;
  website?: string;
  city?: string;
  state?: string;
  country?: string;
}) {
  const id = await insertLead(data);
  revalidatePath("/lead");
  return { id };
}
