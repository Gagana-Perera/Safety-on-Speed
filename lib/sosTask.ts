import * as TaskManager from "expo-task-manager";

import {
  SOS_LOCATION_TASK_NAME,
  getStoredActiveSOSSession,
  updateSOSSessionLocation,
} from "@/lib/sosService";

type TaskLocationData = {
  locations?: Array<{
    coords?: {
      accuracy?: number | null;
      latitude: number;
      longitude: number;
    };
  }>;
};

if (!TaskManager.isTaskDefined(SOS_LOCATION_TASK_NAME)) {
  TaskManager.defineTask(SOS_LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) {
      console.error("SOS task manager error:", error.message);
      return;
    }

    const activeSession = await getStoredActiveSOSSession();
    const taskData = data as TaskLocationData | undefined;
    const coords = taskData?.locations?.[0]?.coords;

    if (!activeSession || !coords || activeSession.status !== "active") {
      return;
    }

    try {
      await updateSOSSessionLocation({
        accuracy:
          typeof coords.accuracy === "number" ? coords.accuracy : null,
        latitude: coords.latitude,
        longitude: coords.longitude,
        sessionId: activeSession.sessionId,
      });
    } catch (taskError) {
      console.error("Failed to update SOS location in background:", taskError);
    }
  });
}
