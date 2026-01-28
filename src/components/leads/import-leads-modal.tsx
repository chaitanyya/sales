"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    IconUpload,
    IconDownload,
    IconFileSpreadsheet,
    IconBrandGoogleDrive,
    IconLoader2,
    IconAlertCircle,
    IconCheck,
    IconX,
} from "@tabler/icons-react";
import Papa from "papaparse";
import { toast } from "sonner";
import {
    generateLeadTemplate,
    downloadCSV,
    fetchGoogleSheetCSV,
    LEAD_CSV_HEADERS,
} from "@/lib/csv-templates";
import { insertLeadsBulk } from "@/lib/tauri/commands";
import type { NewLead } from "@/lib/tauri/types";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { queryClient } from "@/lib/query/query-client";
import { queryKeys } from "@/lib/query/keys";

interface ImportLeadsModalProps {
    onSuccess?: () => void;
}

export function ImportLeadsModal({ onSuccess }: ImportLeadsModalProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fetchingSheet, setFetchingSheet] = useState(false);
    const [sheetUrl, setSheetUrl] = useState("");
    const [fileName, setFileName] = useState<string | null>(null);
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [parseErrors, setParseErrors] = useState<string[]>([]);
    const [isDragging, setIsDragging] = useState(false);

    const resetState = () => {
        setFileName(null);
        setParsedData([]);
        setParseErrors([]);
        setSheetUrl("");
    };

    const parseCSVData = useCallback((csvText: string) => {
        Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const data = results.data;
                const errors: string[] = [];

                if (data.length === 0) {
                    errors.push("The CSV file is empty");
                } else {
                    // Basic validation
                    data.forEach((row: any, index) => {
                        if (!row.companyName || !row.companyName.trim()) {
                            errors.push(`Row ${index + 1}: companyName is required`);
                        }
                    });
                }

                setParsedData(data);
                setParseErrors(errors);
            },
            error: (error: any) => {
                setParseErrors([`Failed to parse CSV: ${error.message}`]);
            },
        });
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFileName(file.name);
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target?.result as string;
                parseCSVData(text);
            };
            reader.readAsText(file);
        }
    };

    // Tauri native file drop handling
    useEffect(() => {
        if (!open) return;

        const unlisteners: UnlistenFn[] = [];

        const setupListeners = async () => {
            const unlistenEnter = await listen<{ paths: string[] }>("tauri://drag-enter", () => {
                setIsDragging(true);
            });
            unlisteners.push(unlistenEnter);

            const unlistenLeave = await listen("tauri://drag-leave", () => {
                setIsDragging(false);
            });
            unlisteners.push(unlistenLeave);

            const unlistenDrop = await listen<{ paths: string[] }>("tauri://drag-drop", async (event) => {
                setIsDragging(false);
                const paths = event.payload.paths;
                if (paths && paths.length > 0) {
                    const filePath = paths[0];
                    if (filePath.endsWith(".csv")) {
                        try {
                            const content = await readTextFile(filePath);
                            setFileName(filePath.split("/").pop() || "Dropped File");
                            parseCSVData(content);
                        } catch (err) {
                            toast.error("Failed to read file: " + (err instanceof Error ? err.message : "Unknown error"));
                        }
                    } else {
                        toast.error("Please drop a CSV file");
                    }
                }
            });
            unlisteners.push(unlistenDrop);
        };

        setupListeners();

        return () => {
            unlisteners.forEach((unlisten) => unlisten());
        };
    }, [open, parseCSVData]);

    const handleFetchGoogleSheet = async () => {
        if (!sheetUrl.trim()) return;

        setFetchingSheet(true);
        setParseErrors([]);
        try {
            const csvText = await fetchGoogleSheetCSV(sheetUrl);
            parseCSVData(csvText);
            setFileName("Google Sheet Content");
        } catch (error) {
            setParseErrors([error instanceof Error ? error.message : "Failed to fetch Google Sheet"]);
        } finally {
            setFetchingSheet(false);
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            const saved = await downloadCSV("leads-template.csv", generateLeadTemplate());
            if (saved) {
                toast.success("Template saved successfully");
            }
        } catch (error) {
            toast.error("Failed to save template: " + (error instanceof Error ? error.message : "Unknown error"));
        }
    };

    const handleSubmit = async () => {
        if (parsedData.length === 0 || parseErrors.length > 0) return;

        setLoading(true);
        try {
            const leads: NewLead[] = parsedData.map((row) => ({
                companyName: row.companyName.trim(),
                website: row.website?.trim() || undefined,
                city: row.city?.trim() || undefined,
                state: row.state?.trim() || undefined,
                country: row.country?.trim() || undefined,
            }));

            console.log("[ImportLeadsModal] parsedData:", JSON.stringify(parsedData, null, 2));
            console.log("[ImportLeadsModal] leads to insert:", JSON.stringify(leads, null, 2));

            const result = await insertLeadsBulk(leads);
            console.log("[ImportLeadsModal] insertLeadsBulk result:", JSON.stringify(result, null, 2));

            if (result.successCount > 0) {
                toast.success(`Successfully imported ${result.successCount} leads`);
                // Explicitly invalidate leads cache to refresh the list
                console.log("[ImportLeadsModal] Invalidating leads cache...");
                await queryClient.invalidateQueries({ queryKey: queryKeys.leadsWithScores() });
                console.log("[ImportLeadsModal] Cache invalidated, closing modal...");
                setOpen(false);
                resetState();
                onSuccess?.();
            }

            if (result.errorCount > 0) {
                console.error("[ImportLeadsModal] Errors:", result.errors);
                toast.error(`Failed to import ${result.errorCount} leads: ${result.errors.join(", ")}`);
            }
        } catch (error) {
            console.error("[ImportLeadsModal] Exception:", error);
            toast.error(`Failed to import leads: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setLoading(false);
        }
    };

    const validRows = parsedData.filter((row) => row.companyName?.trim());

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    return (
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetState(); }}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <IconUpload className="size-3.5" />
                    <span>Import</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-2xl gap-0 p-0 overflow-hidden bg-background border-border shadow-native">
                <DialogHeader className="p-6 pb-4 border-b border-border/50">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-xl font-semibold tracking-tight">Import Leads</DialogTitle>
                        <Button variant="ghost" size="sm" onClick={handleDownloadTemplate} className="h-8 px-2 text-muted-foreground hover:text-foreground">
                            <IconDownload className="size-4 mr-2" />
                            Template
                        </Button>
                    </div>
                </DialogHeader>

                <div className="p-6">
                    <Tabs defaultValue="file" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/30 p-1 h-10 rounded-md">
                            <TabsTrigger value="file" className="data-[active=true]:bg-background data-[active=true]:shadow-sm rounded-[4px]">
                                <IconFileSpreadsheet className="size-4 mr-2" />
                                CSV File
                            </TabsTrigger>
                            <TabsTrigger value="gsheet" className="data-[active=true]:bg-background data-[active=true]:shadow-sm rounded-[4px]">
                                <IconBrandGoogleDrive className="size-4 mr-2" />
                                Google Sheets
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="file" className="mt-0 outline-none">
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className={cn(
                                    "relative group border-2 border-dashed border-border/50 rounded-xl p-10 text-center transition-all duration-200 cursor-pointer",
                                    "hover:border-primary/50 hover:bg-primary/5",
                                    isDragging && "border-primary bg-primary/10 scale-[1.02]",
                                    fileName ? "bg-primary/5 border-primary/30" : "bg-muted/10"
                                )}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                                <div className="flex flex-col items-center gap-3">
                                    <div className={cn(
                                        "size-12 rounded-full flex items-center justify-center bg-background border border-border shadow-native-sm transition-transform duration-200 group-hover:scale-110",
                                        fileName && "border-primary/50 text-primary"
                                    )}>
                                        <IconUpload className="size-6" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-foreground">
                                            {fileName || "Drop your CSV here"}
                                        </p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            or click to browse from your computer
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="gsheet" className="mt-0 outline-none">
                            <div className="space-y-4 p-4 border border-border/50 rounded-xl bg-muted/10">
                                <div className="space-y-1.5">
                                    <Label className="text-sm font-medium">Public Google Sheet URL</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Ensure the sheet is shared with "Anyone with the link can view"
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Input
                                        value={sheetUrl}
                                        onChange={(e) => setSheetUrl(e.target.value)}
                                        placeholder="https://docs.google.com/spreadsheets/d/..."
                                        className="h-10 bg-background border-border"
                                    />
                                    <Button
                                        onClick={handleFetchGoogleSheet}
                                        disabled={fetchingSheet || !sheetUrl.trim()}
                                        className="h-10 px-4"
                                    >
                                        {fetchingSheet ? <IconLoader2 className="size-4 animate-spin" /> : "Fetch"}
                                    </Button>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>

                    {/* Preview Area */}
                    {(parsedData.length > 0 || parseErrors.length > 0) && (
                        <div className="mt-8 space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                                    Preview & Validation
                                </h3>
                                {fileName && (
                                    <button
                                        onClick={resetState}
                                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                                    >
                                        <IconX className="size-3" /> Clear
                                    </button>
                                )}
                            </div>

                            {parseErrors.length > 0 && (
                                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex items-center gap-2 text-destructive text-sm font-semibold mb-2">
                                        <IconAlertCircle className="size-4" />
                                        Validation Failed
                                    </div>
                                    <ul className="grid grid-cols-1 gap-1">
                                        {parseErrors.slice(0, 3).map((error, i) => (
                                            <li key={i} className="text-xs text-destructive/90 flex items-start gap-2">
                                                <span className="mt-1 size-1 rounded-full bg-destructive/50 shrink-0" />
                                                {error}
                                            </li>
                                        ))}
                                        {parseErrors.length > 3 && (
                                            <li className="text-xs text-destructive/70 mt-1 pl-3 font-medium">
                                                + {parseErrors.length - 3} more errors
                                            </li>
                                        )}
                                    </ul>
                                </div>
                            )}

                            {parsedData.length > 0 && parseErrors.length === 0 && (
                                <div className="border border-border rounded-xl overflow-hidden bg-muted/5 shadow-inner">
                                    <div className="max-h-60 overflow-x-auto overflow-y-auto scroll-stable">
                                        <table className="min-w-full text-xs text-left border-collapse">
                                            <thead className="sticky top-0 bg-background/80 backdrop-blur-md z-10">
                                                <tr className="border-b border-border">
                                                    {LEAD_CSV_HEADERS.map((header) => (
                                                        <th key={header} className="px-4 py-3 font-semibold text-muted-foreground bg-muted/20">
                                                            {header}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/30">
                                                {parsedData.slice(0, 10).map((row, i) => (
                                                    <tr key={i} className="hover:bg-muted/20 transition-colors">
                                                        <td className="px-4 py-2.5 font-medium text-foreground">{row.companyName}</td>
                                                        <td className="px-4 py-2.5 text-muted-foreground truncate max-w-[120px]">{row.website || "—"}</td>
                                                        <td className="px-4 py-2.5 text-muted-foreground">{row.city || "—"}</td>
                                                        <td className="px-4 py-2.5 text-muted-foreground">{row.state || "—"}</td>
                                                        <td className="px-4 py-2.5 text-muted-foreground">{row.country || "—"}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {parsedData.length > 10 && (
                                            <div className="px-4 py-3 text-center border-t border-border bg-muted/5">
                                                <span className="text-xs text-muted-foreground font-medium">
                                                    Showing first 10 of {parsedData.length} records
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="p-6 pt-0 bg-muted/5 border-t border-border/50">
                    <div className="flex items-center justify-between w-full">
                        <div className="text-xs text-muted-foreground">
                            {validRows.length > 0 && (
                                <span className="flex items-center gap-1.5 text-success font-medium">
                                    <IconCheck className="size-3.5" />
                                    {validRows.length} leads ready
                                </span>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={loading || validRows.length === 0 || parseErrors.length > 0}
                                className="min-w-32 shadow-md"
                            >
                                {loading ? (
                                    <>
                                        <IconLoader2 className="size-4 mr-2 animate-spin" />
                                        Importing...
                                    </>
                                ) : (
                                    `Import ${validRows.length > 0 ? validRows.length : ""} Leads`
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
