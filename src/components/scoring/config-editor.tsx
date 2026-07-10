"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconDeviceFloppy, IconLoader2, IconPlus, IconTrash } from "@tabler/icons-react";
import { toast } from "sonner";
import { saveScoringConfig } from "@/lib/tauri/commands";
import type {
  RequiredCharacteristic,
  DemandSignifier,
  ParsedScoringConfig,
} from "@/lib/types/scoring";

interface ScoringConfigEditorProps {
  seed: Omit<ParsedScoringConfig, "id" | "createdAt" | "updatedAt"> & {
    id: number | null;
    createdAt: string | null;
    updatedAt: string | null;
  };
}

export function ScoringConfigEditor({ seed }: ScoringConfigEditorProps) {
  const [config, setConfig] = useState(() => seed);
  const [isPending, startTransition] = useTransition();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    startTransition(async () => {
      try {
        const newId = await saveScoringConfig(
          config.name,
          JSON.stringify(config.requiredCharacteristics),
          JSON.stringify(config.demandSignifiers),
          config.tierHotMin,
          config.tierWarmMin,
          config.tierNurtureMin,
          config.id ?? undefined
        );

        if (newId && !config.id) {
          setConfig((prev) => ({ ...prev, id: newId }));
        }
        toast.success("Configuration saved");
      } catch (error) {
        toast.error("Failed to save configuration", {
          description: error instanceof Error ? error.message : "An unexpected error occurred",
        });
      } finally {
        setIsSaving(false);
      }
    });
  };

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="max-w-3xl space-y-6">
        <RequirementsSection
          requirements={config.requiredCharacteristics}
          onChange={(next) => setConfig((prev) => ({ ...prev, requiredCharacteristics: next }))}
        />

        <SignifiersSection
          signifiers={config.demandSignifiers}
          onChange={(next) => setConfig((prev) => ({ ...prev, demandSignifiers: next }))}
        />

        <TierThresholdsSection
          hotMin={config.tierHotMin}
          warmMin={config.tierWarmMin}
          nurtureMin={config.tierNurtureMin}
          onChange={(field, value) => setConfig((prev) => ({ ...prev, [field]: value }))}
        />

        <div className="flex items-center gap-3 pt-4 border-t border-white/5">
          <Button onClick={handleSave} disabled={isPending || isSaving}>
            {isPending || isSaving ? (
              <IconLoader2 className="size-4 animate-spin" />
            ) : (
              <IconDeviceFloppy className="size-4" />
            )}
            {isPending || isSaving ? "Saving…" : "Save Configuration"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function RequirementsSection({
  requirements,
  onChange,
}: {
  requirements: RequiredCharacteristic[];
  onChange: (next: RequiredCharacteristic[]) => void;
}) {
  const add = () => {
    const newReq: RequiredCharacteristic = {
      id: `req-${Date.now()}`,
      name: "",
      description: "",
      enabled: true,
    };
    onChange([...requirements, newReq]);
  };

  const update = (index: number, updates: Partial<RequiredCharacteristic>) => {
    onChange(requirements.map((req, i) => (i === index ? { ...req, ...updates } : req)));
  };

  const remove = (index: number) => {
    onChange(requirements.filter((_, i) => i !== index));
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-medium">Required Characteristics</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pass/fail gates that must be met to qualify as a lead
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={add}>
          <IconPlus className="size-3.5 mr-1.5" />
          Add
        </Button>
      </div>

      <div className="space-y-2">
        {requirements.map((req, index) => (
          <div
            key={req.id}
            className="group flex items-start gap-3 p-3 border border-white/5 rounded-lg hover:border-white/10 transition-colors"
          >
            <div className="flex-1 space-y-2">
              <Input
                value={req.name}
                onChange={(e) => update(index, { name: e.target.value })}
                placeholder="Requirement name"
                className="h-8 text-sm bg-transparent border-white/10"
              />
              <Input
                value={req.description}
                onChange={(e) => update(index, { description: e.target.value })}
                placeholder="Description (what the AI should check for)"
                className="h-8 text-sm bg-transparent border-white/10"
              />
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity mt-1"
              onClick={() => remove(index)}
            >
              <IconTrash className="size-3.5 text-muted-foreground hover:text-red-400" />
            </Button>
          </div>
        ))}

        {requirements.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground border border-dashed border-white/10 rounded-lg">
            No required characteristics defined. Add one to get started.
          </div>
        )}
      </div>
    </section>
  );
}

function SignifiersSection({
  signifiers,
  onChange,
}: {
  signifiers: DemandSignifier[];
  onChange: (next: DemandSignifier[]) => void;
}) {
  const add = () => {
    const newSig: DemandSignifier = {
      id: `sig-${Date.now()}`,
      name: "",
      description: "",
      weight: 5,
      enabled: true,
    };
    onChange([...signifiers, newSig]);
  };

  const update = (index: number, updates: Partial<DemandSignifier>) => {
    onChange(signifiers.map((sig, i) => (i === index ? { ...sig, ...updates } : sig)));
  };

  const remove = (index: number) => {
    onChange(signifiers.filter((_, i) => i !== index));
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-medium">Demand Signifiers</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Weighted scoring factors that contribute to the lead score
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={add}>
          <IconPlus className="size-3.5 mr-1.5" />
          Add
        </Button>
      </div>

      <div className="space-y-2">
        {signifiers.map((sig, index) => (
          <div
            key={sig.id}
            className="group flex items-start gap-3 p-3 border border-white/5 rounded-lg hover:border-white/10 transition-colors"
          >
            <div className="flex-1 space-y-2">
              <div className="flex gap-2">
                <Input
                  value={sig.name}
                  onChange={(e) => update(index, { name: e.target.value })}
                  placeholder="Signifier name"
                  className="h-8 text-sm flex-1 bg-transparent border-white/10"
                />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">Weight:</span>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={sig.weight}
                    onChange={(e) => update(index, { weight: parseInt(e.target.value) || 1 })}
                    className="h-8 w-14 text-sm text-center bg-transparent border-white/10"
                  />
                </div>
              </div>
              <Input
                value={sig.description}
                onChange={(e) => update(index, { description: e.target.value })}
                placeholder="Description (what the AI should evaluate)"
                className="h-8 text-sm bg-transparent border-white/10"
              />
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity mt-1"
              onClick={() => remove(index)}
            >
              <IconTrash className="size-3.5 text-muted-foreground hover:text-red-400" />
            </Button>
          </div>
        ))}

        {signifiers.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground border border-dashed border-white/10 rounded-lg">
            No demand signifiers defined. Add one to get started.
          </div>
        )}
      </div>
    </section>
  );
}

type TierField = "tierHotMin" | "tierWarmMin" | "tierNurtureMin";

function TierThresholdsSection({
  hotMin,
  warmMin,
  nurtureMin,
  onChange,
}: {
  hotMin: number;
  warmMin: number;
  nurtureMin: number;
  onChange: (field: TierField, value: number) => void;
}) {
  return (
    <section>
      <div className="mb-3">
        <h2 className="text-sm font-medium">Tier Thresholds</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Minimum scores for each tier classification
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <TierInput
          id="tier-hot-min"
          label="Hot (Min)"
          dotColor="bg-green-500"
          value={hotMin}
          onChange={(v) => onChange("tierHotMin", v)}
        />
        <TierInput
          id="tier-warm-min"
          label="Warm (Min)"
          dotColor="bg-yellow-500"
          value={warmMin}
          onChange={(v) => onChange("tierWarmMin", v)}
        />
        <TierInput
          id="tier-nurture-min"
          label="Nurture (Min)"
          dotColor="bg-blue-500"
          value={nurtureMin}
          onChange={(v) => onChange("tierNurtureMin", v)}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Leads below {nurtureMin} will be classified as Disqualified
      </p>
    </section>
  );
}

function TierInput({
  id,
  label,
  dotColor,
  value,
  onChange,
}: {
  id: string;
  label: string;
  dotColor: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="p-3 border border-white/5 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <div className={`size-2 rounded-full ${dotColor}`} />
        <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
          {label}
        </label>
      </div>
      <Input
        id={id}
        type="number"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        className="h-8 text-sm bg-transparent border-white/10"
      />
    </div>
  );
}
