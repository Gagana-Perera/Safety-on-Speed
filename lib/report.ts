import { supabase } from "./superbase";

export interface ReportData {
  verification: string;
  incident_details: string;
  safety_check: string;
  user_id?: string;
}

/**
 * Saves a report to the Supabase 'reports' table.
 */
export async function saveReport(reportData: ReportData) {
  const { data, error } = await supabase
    .from("reports") // Ensure this table exists in your Supabase database
    .insert([
      {
        verification: reportData.verification,
        incident_details: reportData.incident_details,
        safety_check: reportData.safety_check,
        user_id: reportData.user_id,
      },
    ])
    .select();

  if (error) {
    console.error("Error saving report:", error.message);
    throw error;
  }

  return data;
}
