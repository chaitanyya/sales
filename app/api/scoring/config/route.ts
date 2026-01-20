import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getActiveScoringConfig, saveScoringConfig } from "@/lib/db/queries";
import { badRequest, jsonSuccess, serverError } from "@/lib/api/responses";
import { defaultScoringConfig } from "@/lib/types/scoring";

const requiredCharacteristicSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string(),
  enabled: z.boolean(),
});

const demandSignifierSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string(),
  weight: z.number().min(1).max(10),
  enabled: z.boolean(),
});

const scoringConfigSchema = z.object({
  id: z.number().optional(),
  name: z.string().default("default"),
  isActive: z.boolean().default(true),
  requiredCharacteristics: z.array(requiredCharacteristicSchema),
  demandSignifiers: z.array(demandSignifierSchema),
  tierHotMin: z.number().min(0).max(100).default(80),
  tierWarmMin: z.number().min(0).max(100).default(50),
  tierNurtureMin: z.number().min(0).max(100).default(30),
});

export async function GET() {
  try {
    const config = await getActiveScoringConfig();

    // If no config exists, return the default config (without saving)
    if (!config) {
      return NextResponse.json({
        config: {
          ...defaultScoringConfig,
          id: null,
          createdAt: null,
          updatedAt: null,
        },
        isDefault: true,
      });
    }

    return NextResponse.json({
      config: {
        id: config.id,
        name: config.name,
        isActive: config.isActive,
        requiredCharacteristics: config.requiredCharacteristics,
        demandSignifiers: config.demandSignifiers,
        tierHotMin: config.tierHotMin,
        tierWarmMin: config.tierWarmMin,
        tierNurtureMin: config.tierNurtureMin,
        createdAt: config.createdAt.toISOString(),
        updatedAt: config.updatedAt.toISOString(),
      },
      isDefault: false,
    });
  } catch (error) {
    console.error("Failed to get scoring config:", error);
    return serverError("Failed to get scoring config");
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parseResult = scoringConfigSchema.safeParse(body);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues[0]?.message || "Invalid request";
      return badRequest(errorMessage);
    }

    const { id, requiredCharacteristics, demandSignifiers, ...rest } = parseResult.data;

    const configToSave = {
      ...rest,
      ...(id ? { id } : {}),
      requiredCharacteristics: JSON.stringify(requiredCharacteristics),
      demandSignifiers: JSON.stringify(demandSignifiers),
    };

    const savedId = await saveScoringConfig(configToSave);

    return jsonSuccess({ success: true, id: savedId });
  } catch (error) {
    console.error("Failed to save scoring config:", error);
    return serverError("Failed to save scoring config");
  }
}
