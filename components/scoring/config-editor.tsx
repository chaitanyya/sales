"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconDeviceFloppy, IconLoader2, IconPlus, IconTrash } from "@tabler/icons-react";
import { toast } from "sonner";
import type {
  RequiredCharacteristic,
  DemandSignifier,
  ParsedScoringConfig,
} from "@/lib/types/scoring";

interface ScoringConfigEditorProps {
  initialConfig: Omit<ParsedScoringConfig, "id" | "createdAt" | "updatedAt"> & {
    id: number | null;
    createdAt: string | null;
    updatedAt: string | null;
  };
}

export function ScoringConfigEditor({ initialConfig }: ScoringConfigEditorProps) {
  const [config, setConfig] = useState(initialConfig);
  const [isPending, startTransition] = useTransition();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    startTransition(async () => {
      try {
        const response = await fetch("/api/scoring/config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(config.id ? { id: config.id } : {}),
            name: config.name,
            isActive: config.isActive,
            requiredCharacteristics: config.requiredCharacteristics,
            demandSignifiers: config.demandSignifiers,
            tierHotMin: config.tierHotMin,
            tierWarmMin: config.tierWarmMin,
            tierNurtureMin: config.tierNurtureMin,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.id && !config.id) {
            setConfig((prev) => ({ ...prev, id: data.id }));
          }
          toast.success("Configuration saved");
        } else {
          const errorData = await response.json().catch(() => ({}));
          toast.error("Failed to save configuration", {
            description: errorData.error || "An unexpected error occurred",
          });
        }
      } catch (error) {
        toast.error("Failed to save configuration");
      } finally {
        setIsSaving(false);
      }
    });
  };

  const addRequirement = () => {
    const newReq: RequiredCharacteristic = {
      id: `req-${Date.now()}`,
      name: "",
      description: "",
      enabled: true,
    };
    setConfig((prev) => ({
      ...prev,
      requiredCharacteristics: [...prev.requiredCharacteristics, newReq],
    }));
  };

  const updateRequirement = (index: number, updates: Partial<RequiredCharacteristic>) => {
    setConfig((prev) => ({
      ...prev,
      requiredCharacteristics: prev.requiredCharacteristics.map((req, i) =>
        i === index ? { ...req, ...updates } : req
      ),
    }));
  };

  const removeRequirement = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      requiredCharacteristics: prev.requiredCharacteristics.filter((_, i) => i !== index),
    }));
  };

  const addSignifier = () => {
    const newSig: DemandSignifier = {
      id: `sig-${Date.now()}`,
      name: "",
      description: "",
      weight: 5,
      enabled: true,
    };
    setConfig((prev) => ({
      ...prev,
      demandSignifiers: [...prev.demandSignifiers, newSig],
    }));
  };

  const updateSignifier = (index: number, updates: Partial<DemandSignifier>) => {
    setConfig((prev) => ({
      ...prev,
      demandSignifiers: prev.demandSignifiers.map((sig, i) =>
        i === index ? { ...sig, ...updates } : sig
      ),
    }));
  };

  const removeSignifier = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      demandSignifiers: prev.demandSignifiers.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="max-w-3xl space-y-6">
        {/* Required Characteristics */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-medium">Required Characteristics</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pass/fail gates that must be met to qualify as a lead
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={addRequirement}>
              <IconPlus className="w-3.5 h-3.5 mr-1.5" />
              Add
            </Button>
          </div>

          <div className="space-y-2">
            {config.requiredCharacteristics.map((req, index) => (
              <div
                key={req.id}
                className="group flex items-start gap-3 p-3 border border-white/5 rounded-lg hover:border-white/10 transition-colors"
              >
                <div className="flex-1 space-y-2">
                  <Input
                    value={req.name}
                    onChange={(e) => updateRequirement(index, { name: e.target.value })}
                    placeholder="Requirement name"
                    className="h-8 text-sm bg-transparent border-white/10"
                  />
                  <Input
                    value={req.description}
                    onChange={(e) => updateRequirement(index, { description: e.target.value })}
                    placeholder="Description (what the AI should check for)"
                    className="h-8 text-sm bg-transparent border-white/10"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity mt-1"
                  onClick={() => removeRequirement(index)}
                >
                  <IconTrash className="w-3.5 h-3.5 text-muted-foreground hover:text-red-400" />
                </Button>
              </div>
            ))}

            {config.requiredCharacteristics.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground border border-dashed border-white/10 rounded-lg">
                No required characteristics defined. Add one to get started.
              </div>
            )}
          </div>
        </section>

        {/* Demand Signifiers */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-medium">Demand Signifiers</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Weighted scoring factors that contribute to the lead score
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={addSignifier}>
              <IconPlus className="w-3.5 h-3.5 mr-1.5" />
              Add
            </Button>
          </div>

          <div className="space-y-2">
            {config.demandSignifiers.map((sig, index) => (
              <div
                key={sig.id}
                className="group flex items-start gap-3 p-3 border border-white/5 rounded-lg hover:border-white/10 transition-colors"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={sig.name}
                      onChange={(e) => updateSignifier(index, { name: e.target.value })}
                      placeholder="Signifier name"
                      className="h-8 text-sm flex-1 bg-transparent border-white/10"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        Weight:
                      </span>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={sig.weight}
                        onChange={(e) =>
                          updateSignifier(index, { weight: parseInt(e.target.value) || 1 })
                        }
                        className="h-8 w-14 text-sm text-center bg-transparent border-white/10"
                      />
                    </div>
                  </div>
                  <Input
                    value={sig.description}
                    onChange={(e) => updateSignifier(index, { description: e.target.value })}
                    placeholder="Description (what the AI should evaluate)"
                    className="h-8 text-sm bg-transparent border-white/10"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity mt-1"
                  onClick={() => removeSignifier(index)}
                >
                  <IconTrash className="w-3.5 h-3.5 text-muted-foreground hover:text-red-400" />
                </Button>
              </div>
            ))}

            {config.demandSignifiers.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground border border-dashed border-white/10 rounded-lg">
                No demand signifiers defined. Add one to get started.
              </div>
            )}
          </div>
        </section>

        {/* Tier Thresholds */}
        <section>
          <div className="mb-3">
            <h2 className="text-sm font-medium">Tier Thresholds</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Minimum scores for each tier classification
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 border border-white/5 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <label className="text-xs font-medium text-muted-foreground">Hot (Min)</label>
              </div>
              <Input
                type="number"
                min={0}
                max={100}
                value={config.tierHotMin}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, tierHotMin: parseInt(e.target.value) || 0 }))
                }
                className="h-8 text-sm bg-transparent border-white/10"
              />
            </div>
            <div className="p-3 border border-white/5 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <label className="text-xs font-medium text-muted-foreground">Warm (Min)</label>
              </div>
              <Input
                type="number"
                min={0}
                max={100}
                value={config.tierWarmMin}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, tierWarmMin: parseInt(e.target.value) || 0 }))
                }
                className="h-8 text-sm bg-transparent border-white/10"
              />
            </div>
            <div className="p-3 border border-white/5 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <label className="text-xs font-medium text-muted-foreground">Nurture (Min)</label>
              </div>
              <Input
                type="number"
                min={0}
                max={100}
                value={config.tierNurtureMin}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, tierNurtureMin: parseInt(e.target.value) || 0 }))
                }
                className="h-8 text-sm bg-transparent border-white/10"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Leads below {config.tierNurtureMin} will be classified as Disqualified
          </p>
        </section>

        {/* Save */}
        <div className="flex items-center gap-3 pt-4 border-t border-white/5">
          <Button onClick={handleSave} disabled={isPending || isSaving}>
            {isPending || isSaving ? (
              <IconLoader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <IconDeviceFloppy className="w-4 h-4 mr-2" />
            )}
            Save Configuration
          </Button>
        </div>
      </div>
    </div>
  );
}
