import { NextRequest } from "next/server";
import { z } from "zod";
import { savePromptByType, getPromptByType } from "@/lib/db/queries";
import { badRequest, jsonSuccess, serverError } from "@/lib/api/responses";

const promptSchema = z.object({
  content: z.string().min(1, "Prompt content is required"),
  type: z.enum(["company", "person"]).default("company"),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = (searchParams.get("type") || "company") as "company" | "person";

    const prompt = await getPromptByType(type);
    if (!prompt) {
      return jsonSuccess({ prompt: null });
    }
    return jsonSuccess({
      prompt: {
        id: prompt.id,
        type: prompt.type,
        content: prompt.content,
        createdAt: prompt.createdAt.toISOString(),
        updatedAt: prompt.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Failed to get prompt:", error);
    return serverError("Failed to get prompt");
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parseResult = promptSchema.safeParse(body);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues[0]?.message || "Invalid request";
      return badRequest(errorMessage);
    }

    const { content, type } = parseResult.data;
    const id = await savePromptByType(type, content);

    return jsonSuccess({ success: true, id });
  } catch (error) {
    console.error("Failed to save prompt:", error);
    return serverError("Failed to save prompt");
  }
}
