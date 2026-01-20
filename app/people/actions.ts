"use server";

import { insertPerson } from "@/lib/db/queries";
import { revalidatePath } from "next/cache";

export async function addPerson(data: {
  firstName: string;
  lastName: string;
  email?: string;
  title?: string;
  leadId: number;
}) {
  const id = await insertPerson(data);
  revalidatePath("/people");
  return { id };
}
