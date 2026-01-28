/**
 * CSV Templates and Utilities for Bulk Upload
 */

import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";

// ============================================================================
// Lead CSV Template
// ============================================================================

export const LEAD_CSV_HEADERS = [
    "companyName",
    "website",
    "city",
    "state",
    "country",
] as const;

export type LeadCSVRow = {
    companyName: string;
    website?: string;
    city?: string;
    state?: string;
    country?: string;
};

export function generateLeadTemplate(): string {
    return LEAD_CSV_HEADERS.join(",") + "\n" + "Acme Corp,https://example.com,San Francisco,CA,USA";
}

// ============================================================================
// Person CSV Template
// ============================================================================

export const PERSON_CSV_HEADERS = [
    "firstName",
    "lastName",
    "email",
    "title",
    "linkedinUrl",
    "companyName",
] as const;

export type PersonCSVRow = {
    firstName: string;
    lastName: string;
    email?: string;
    title?: string;
    linkedinUrl?: string;
    companyName?: string; // Used to lookup lead_id
};

export function generatePersonTemplate(): string {
    return PERSON_CSV_HEADERS.join(",") + "\n" + "John,Smith,john@example.com,VP of Sales,,Acme Corp";
}

// ============================================================================
// CSV Download Utility (Native Tauri File Dialog)
// ============================================================================

/**
 * Save CSV content to file using native Tauri file dialog
 */
export async function downloadCSV(filename: string, content: string): Promise<boolean> {
    try {
        const filePath = await save({
            title: "Save CSV Template",
            defaultPath: filename,
            filters: [
                {
                    name: "CSV Files",
                    extensions: ["csv"],
                },
            ],
        });

        if (filePath) {
            await writeTextFile(filePath, content);
            console.log("CSV saved to:", filePath);
            return true;
        }
        return false; // User cancelled
    } catch (error) {
        console.error("Failed to save CSV file:", error);
        throw error;
    }
}

// ============================================================================
// Google Sheets URL Parser
// ============================================================================

/**
 * Extracts the sheet ID from a Google Sheets URL and returns the CSV export URL
 * Supports URLs like:
 * - https://docs.google.com/spreadsheets/d/SHEET_ID/edit
 * - https://docs.google.com/spreadsheets/d/SHEET_ID/edit#gid=0
 */
export function getGoogleSheetsCsvUrl(url: string): string | null {
    const regex = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
    const match = url.match(regex);
    if (match && match[1]) {
        return `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
    }
    return null;
}

/**
 * Fetch CSV data from a public Google Sheet
 */
export async function fetchGoogleSheetCSV(url: string): Promise<string> {
    const csvUrl = getGoogleSheetsCsvUrl(url);
    if (!csvUrl) {
        throw new Error("Invalid Google Sheets URL. Please provide a valid public sheet URL.");
    }

    const response = await fetch(csvUrl);
    if (!response.ok) {
        throw new Error("Failed to fetch Google Sheet. Make sure the sheet is publicly accessible.");
    }

    return response.text();
}
