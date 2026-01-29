import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { IconLoader2, IconRefresh, IconBuildingFactory, IconCheck } from "@tabler/icons-react";
import { useCompanyProfile } from "@/lib/hooks/use-company-profile";
import { useQueryClient } from "@tanstack/react-query";
import type { ParsedCompanyProfile, AudienceSegment, USP, TalkingPoint, Competitor, MarketInsight, SalesNarrative } from "@/lib/tauri/types";

// Helper to create a safe editing state with all required fields
function createEditingData(profile: ParsedCompanyProfile | null): ParsedCompanyProfile {
  if (!profile) {
    return {
      id: 0,
      companyName: "",
      productName: "",
      website: "",
      targetAudience: [],
      usps: [],
      marketingNarrative: "",
      salesNarrative: { elevatorPitch: "", talkingPoints: [] },
      competitors: [],
      marketInsights: [],
      rawAnalysis: "",
      researchStatus: "pending",
      researchedAt: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }
  return {
    ...profile,
    targetAudience: profile.targetAudience ?? [],
    usps: profile.usps ?? [],
    marketingNarrative: profile.marketingNarrative ?? "",
    salesNarrative: profile.salesNarrative ?? { elevatorPitch: "", talkingPoints: [] },
    competitors: profile.competitors ?? [],
    marketInsights: profile.marketInsights ?? [],
  };
}

export default function CompanyProfilePage() {
  const queryClient = useQueryClient();
  const { profile, isLoading, saveProfile, startResearch, isSaving, isResearching } = useCompanyProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [editingData, setEditingData] = useState<ParsedCompanyProfile | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<"idle" | "running" | "complete">("idle");

  const handleStartAnalysis = async () => {
    if (!profile?.companyName || !profile?.productName || !profile?.website) {
      toast.error("Please complete your basic company information first");
      return;
    }

    setAnalysisStatus("running");
    try {
      await startResearch(
        profile.companyName,
        profile.productName,
        profile.website
      );
      queryClient.invalidateQueries({ queryKey: ["company-profile"] });
      setAnalysisStatus("complete");
      setTimeout(() => setAnalysisStatus("idle"), 2000);
    } catch (error) {
      console.error("Failed to start analysis:", error);
      toast.error("Failed to start analysis");
      setAnalysisStatus("idle");
    }
  };

  const handleSave = async () => {
    if (!editingData) return;

    try {
      await saveProfile(editingData);
      setIsEditing(false);
      setEditingData(null);
      queryClient.invalidateQueries({ queryKey: ["company-profile"] });
      toast.success("Company profile saved");
    } catch (error) {
      console.error("Failed to save profile:", error);
      toast.error("Failed to save profile");
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingData(null);
  };

  const handleEdit = () => {
    setEditingData(createEditingData(profile));
    setIsEditing(true);
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <IconLoader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) {
    return (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-4 p-8">
      <IconBuildingFactory className="w-12 h-12 text-muted-foreground" />
      <div>
        <h2 className="text-lg font-semibold">No company profile found</h2>
        <p className="text-sm text-muted-foreground">
          Complete the onboarding to create your company profile.
        </p>
      </div>
    </div>
  );
  }

  if (isEditing && editingData) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Edit Company Profile</h1>
            <p className="text-muted-foreground">
              Editing profile for <strong>{editingData.companyName}</strong>
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <IconLoader2 className="animate-spin mr-2" />}
              Save
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input
                    value={editingData.companyName}
                    onChange={(e) => setEditingData({ ...editingData, companyName: e.target.value })}
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Product Name</Label>
                  <Input
                    value={editingData.productName}
                    onChange={(e) => setEditingData({ ...editingData, productName: e.target.value })}
                    disabled={isSaving}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Website</Label>
                <Input
                  value={editingData.website}
                  onChange={(e) => setEditingData({ ...editingData, website: e.target.value })}
                  disabled={isSaving}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Target Audience</CardTitle>
              <CardDescription>Who you sell to</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {editingData.targetAudience.map((audience, i) => (
                <div key={audience.id || i} className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>Segment Name</Label>
                    <Input
                      value={audience.segment}
                      onChange={(e) => {
                        const updated = [...editingData.targetAudience];
                        updated[i] = { ...audience, segment: e.target.value };
                        setEditingData({ ...editingData, targetAudience: updated });
                      }}
                      disabled={isSaving}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={audience.description}
                      onChange={(e) => {
                        const updated = [...editingData.targetAudience];
                        updated[i] = { ...audience, description: e.target.value };
                        setEditingData({ ...editingData, targetAudience: updated });
                      }}
                      disabled={isSaving}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Unique Selling Propositions</CardTitle>
              <CardDescription>What makes you different</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {editingData.usps.map((usp, i) => (
                <div key={usp.id || i} className="p-4 border rounded-lg space-y-2">
                  <div className="space-y-2">
                    <Label>Headline</Label>
                    <Input
                      value={usp.headline}
                      onChange={(e) => {
                        const updated = [...editingData.usps];
                        updated[i] = { ...usp, headline: e.target.value };
                        setEditingData({ ...editingData, usps: updated });
                      }}
                      disabled={isSaving}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Explanation</Label>
                    <Textarea
                      value={usp.explanation}
                      onChange={(e) => {
                        const updated = [...editingData.usps];
                        updated[i] = { ...usp, explanation: e.target.value };
                        setEditingData({ ...editingData, usps: updated });
                      }}
                      disabled={isSaving}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Marketing Narrative</CardTitle>
              <CardDescription>Your brand positioning</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={editingData.marketingNarrative}
                onChange={(e) => setEditingData({ ...editingData, marketingNarrative: e.target.value })}
                disabled={isSaving}
                className="min-h-32"
                placeholder="How your company describes itself to prospects..."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sales Narrative</CardTitle>
              <CardDescription>How salespeople should talk about your company</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Elevator Pitch</Label>
                <Input
                  value={editingData.salesNarrative.elevatorPitch}
                  onChange={(e) => setEditingData({
                    ...editingData,
                    salesNarrative: { ...editingData.salesNarrative, elevatorPitch: e.target.value }
                  })}
                  disabled={isSaving}
                  placeholder="A 2-3 sentence pitch about what you do..."
                />
              </div>
              <div className="space-y-2">
                <Label>Talking Points</Label>
                {editingData.salesNarrative.talkingPoints.map((point, i) => (
                  <div key={point.id || i} className="flex gap-2 items-center">
                    <Input
                      value={point.content}
                      onChange={(e) => {
                        const updated = [...editingData.salesNarrative.talkingPoints];
                        updated[i] = { ...point, content: e.target.value };
                        setEditingData({
                          ...editingData,
                          salesNarrative: { ...editingData.salesNarrative, talkingPoints: updated }
                        });
                      }}
                      disabled={isSaving}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Competitors</CardTitle>
              <CardDescription>Who you compete with</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {editingData.competitors.map((competitor, i) => (
                <div key={competitor.id || i} className="flex gap-2 items-center">
                  <Input
                    value={competitor.name}
                    onChange={(e) => {
                      const updated = [...editingData.competitors];
                      updated[i] = { ...competitor, name: e.target.value };
                      setEditingData({ ...editingData, competitors: updated });
                    }}
                    disabled={isSaving}
                    placeholder="Competitor name"
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Market Insights</CardTitle>
              <CardDescription>Industry trends and context</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {editingData.marketInsights.map((insight, i) => (
                <div key={insight.id || i} className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Category</Label>
                      <Input
                        value={insight.category}
                        onChange={(e) => {
                          const updated = [...editingData.marketInsights];
                          updated[i] = { ...insight, category: e.target.value as any };
                          setEditingData({ ...editingData, marketInsights: updated });
                        }}
                        disabled={isSaving}
                      />
                    </div>
                  </div>
                  <Textarea
                    value={insight.content}
                    onChange={(e) => {
                      const updated = [...editingData.marketInsights];
                      updated[i] = { ...insight, content: e.target.value };
                      setEditingData({ ...editingData, marketInsights: updated });
                    }}
                    disabled={isSaving}
                    placeholder="Market insight..."
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Company Profile</h1>
            <p className="text-muted-foreground">
              Manage your company information for better lead research and scoring
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleStartAnalysis}
              disabled={isResearching || analysisStatus === "running"}
            >
              {isResearching || analysisStatus === "running" ? (
                <>
                  <IconLoader2 className="animate-spin mr-2" />
                  Analyzing...
                </>
              ) : (
                <>
                  <IconRefresh className="mr-2" />
                  Re-run Analysis
                </>
              )}
            </Button>
            <Button onClick={handleEdit}>
              Edit Profile
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Status banner */}
          {analysisStatus === "complete" && (
            <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200 rounded-lg">
              <IconCheck className="w-5 h-5" />
              <span>Analysis complete! Your profile has been updated.</span>
            </div>
          )}

          {/* Company Overview */}
          <Card>
            <CardHeader>
              <CardTitle>{profile.companyName}</CardTitle>
              <CardDescription>{profile.productName}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-sm font-medium">Website: </span>
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline ml-2"
                >
                  {profile.website}
                </a>
              </div>
              <div className="text-sm text-muted-foreground">
                Last updated: {new Date(profile.updatedAt).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>

          {/* Sections */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Target Audience */}
            <Card>
              <CardHeader>
                <CardTitle>Target Audience</CardTitle>
              </CardHeader>
              <CardContent>
                {profile.targetAudience.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No audience data</p>
                ) : (
                  <div className="space-y-3">
                    {profile.targetAudience.map((audience) => (
                      <div key={audience.id} className="p-3 bg-muted/50 rounded-lg">
                        <p className="font-medium text-sm">{audience.segment}</p>
                        <p className="text-xs text-muted-foreground">{audience.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* USPs */}
            <Card>
              <CardHeader>
                <CardTitle>Unique Selling Propositions</CardTitle>
              </CardHeader>
              <CardContent>
                {profile.usps.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No USPs defined</p>
                ) : (
                  <div className="space-y-3">
                    {profile.usps.map((usp) => (
                      <div key={usp.id} className="p-3 bg-muted/50 rounded-lg">
                        <p className="font-medium text-sm">{usp.headline}</p>
                        <p className="text-xs text-muted-foreground">{usp.explanation}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Marketing Narrative */}
            <Card>
              <CardHeader>
                <CardTitle>Marketing Narrative</CardTitle>
              </CardHeader>
              <CardContent>
                {!profile.marketingNarrative ? (
                  <p className="text-sm text-muted-foreground italic">No marketing narrative</p>
                ) : (
                  <div className="prose prose-sm max-h-48 overflow-y-auto text-sm">
                    <p className="whitespace-pre-wrap">{profile.marketingNarrative}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sales Narrative */}
            <Card>
              <CardHeader>
                <CardTitle>Sales Narrative</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Elevator Pitch:</p>
                  <p className="text-sm">{profile.salesNarrative.elevatorPitch || "Not defined"}</p>
                </div>
                {profile.salesNarrative.talkingPoints.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Talking Points:</p>
                    <ul className="list-disc pl-4 text-xs text-muted-foreground space-y-1">
                      {profile.salesNarrative.talkingPoints.map((point) => (
                        <li key={point.id}>{point.content}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Competitors */}
            <Card>
              <CardHeader>
                <CardTitle>Competitors</CardTitle>
              </CardHeader>
              <CardContent>
                {profile.competitors.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No competitors listed</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {profile.competitors.map((competitor) => (
                      <span
                        key={competitor.id}
                        className="px-3 py-1 bg-muted rounded-full text-xs"
                      >
                        {competitor.name}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Market Insights */}
            <Card>
              <CardHeader>
                <CardTitle>Market Insights</CardTitle>
              </CardHeader>
              <CardContent>
                {profile.marketInsights.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No market insights</p>
                ) : (
                  <div className="space-y-2">
                    {profile.marketInsights.map((insight) => (
                      <div key={insight.id} className="text-xs">
                        <span className="font-medium text-muted-foreground">{insight.category}:</span>
                        <span className="ml-2">{insight.content}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
