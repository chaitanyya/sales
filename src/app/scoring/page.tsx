"use client";

import { useEffect, useState, useCallback } from "react";
import { ScoringConfigEditor } from "@/components/scoring/config-editor";
import { IconTargetArrow, IconLoader2 } from "@tabler/icons-react";
import { getActiveScoringConfig } from "@/lib/tauri/commands";
import { defaultScoringConfig } from "@/lib/types/scoring";
import type { RequiredCharacteristic, DemandSignifier } from "@/lib/types/scoring";

export default function ScoringPage() {
  const [initialConfig, setInitialConfig] = useState<{
    id: number | null;
    name: string;
    isActive: boolean;
    requiredCharacteristics: RequiredCharacteristic[];
    demandSignifiers: DemandSignifier[];
    tierHotMin: number;
    tierWarmMin: number;
    tierNurtureMin: number;
    createdAt: string | null;
    updatedAt: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      const config = await getActiveScoringConfig();

      if (config) {
        // Parse JSON fields if they're strings
        const requiredCharacteristics =
          typeof config.requiredCharacteristics === "string"
            ? JSON.parse(config.requiredCharacteristics)
            : config.requiredCharacteristics;
        const demandSignifiers =
          typeof config.demandSignifiers === "string"
            ? JSON.parse(config.demandSignifiers)
            : config.demandSignifiers;

        setInitialConfig({
          id: config.id,
          name: config.name,
          isActive: config.isActive,
          requiredCharacteristics,
          demandSignifiers,
          tierHotMin: config.tierHotMin,
          tierWarmMin: config.tierWarmMin,
          tierNurtureMin: config.tierNurtureMin,
          createdAt: config.createdAt ? new Date(config.createdAt).toISOString() : null,
          updatedAt: config.updatedAt ? new Date(config.updatedAt).toISOString() : null,
        });
      } else {
        setInitialConfig({
          ...defaultScoringConfig,
          id: null,
          createdAt: null,
          updatedAt: null,
        });
      }
    } catch (error) {
      console.error("Failed to fetch scoring config:", error);
      setInitialConfig({
        ...defaultScoringConfig,
        id: null,
        createdAt: null,
        updatedAt: null,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  if (loading) {
    return (
      <>
        <header className="h-10 border-b border-white/5 flex items-center px-4 gap-2">
          <IconTargetArrow className="w-4 h-4" />
          <h1 className="text-sm font-medium">Scoring Configuration</h1>
        </header>
        <div className="flex items-center justify-center h-64">
          <IconLoader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  if (!initialConfig) {
    return (
      <>
        <header className="h-10 border-b border-white/5 flex items-center px-4 gap-2">
          <IconTargetArrow className="w-4 h-4" />
          <h1 className="text-sm font-medium">Scoring Configuration</h1>
        </header>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Failed to load configuration</p>
        </div>
      </>
    );
  }

  return (
    <>
      <header className="h-10 border-b border-white/5 flex items-center px-4 gap-2">
        <IconTargetArrow className="w-4 h-4" />
        <h1 className="text-sm font-medium">Scoring Configuration</h1>
      </header>

      <ScoringConfigEditor initialConfig={initialConfig} />
    </>
  );
}
