import { getActiveScoringConfig } from "@/lib/db/queries";
import { ScoringConfigEditor } from "@/components/scoring/config-editor";
import { IconTargetArrow } from "@tabler/icons-react";
import { defaultScoringConfig } from "@/lib/types/scoring";

export const dynamic = "force-dynamic";

export default async function ScoringPage() {
  const config = await getActiveScoringConfig();

  // Use existing config or default
  const initialConfig = config
    ? {
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
      }
    : {
        ...defaultScoringConfig,
        id: null,
        createdAt: null,
        updatedAt: null,
      };

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
