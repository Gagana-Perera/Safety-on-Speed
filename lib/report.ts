import { getCurrentPositionAsync, LocationAccuracy } from "expo-location";
import { getCurrentUser } from "./auth";
import { supabase } from "./superbase";

export interface ReportData {
  verification: boolean;
  incident_type: string;
  safety_check: boolean;
}

/**
 * Saving a report to the Supabase 'reports' table.
 * we use async to define the function (in the head of the functio) and await inside the fucntion method
 */
export async function saveReport(reportData: ReportData) { //public saveReport(ReportData reportData)  
  const location = await getCurrentPositionAsync({ accuracy: LocationAccuracy.High });

  const { data, error } = await supabase
    .from("reports") // Ensure this table exists in your Supabase database
    .insert([
      {
        verification: reportData.verification,
        incident_type: reportData.incident_type,
        safety_check: reportData.safety_check,
        user_id: (await getCurrentUser()).id,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      },
    ])
    .select();

  if (error) {
    console.error("Error saving report:", error.message);
    throw error;
  }

  return data;
}
