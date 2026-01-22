"use server";

import { getPromptByType, savePromptByType } from "@/lib/db/queries";
import { revalidatePath } from "next/cache";

export async function getCompanyOverview() {
  const prompt = await getPromptByType("company_overview");
  return prompt?.content ?? null;
}

export async function saveCompanyOverview(content: string) {
  if (!content.trim()) {
    throw new Error("Company overview cannot be empty");
  }

  await savePromptByType("company_overview", content.trim());
  revalidatePath("/");
  return { success: true };
}
