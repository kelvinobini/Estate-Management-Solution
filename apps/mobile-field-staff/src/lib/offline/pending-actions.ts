import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, NetworkError } from "../api/client";

const QUEUE_KEY = "ems_pending_status_updates";

interface PendingStatusUpdate {
  workOrderId: string;
  status: string;
  queuedAt: string;
}

export async function getPendingUpdates(): Promise<PendingStatusUpdate[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? (JSON.parse(raw) as PendingStatusUpdate[]) : [];
}

async function setPendingUpdates(updates: PendingStatusUpdate[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updates));
}

export async function isPending(workOrderId: string): Promise<boolean> {
  const updates = await getPendingUpdates();
  return updates.some((u) => u.workOrderId === workOrderId);
}

export async function queueStatusUpdate(workOrderId: string, status: string): Promise<void> {
  const updates = await getPendingUpdates();
  // A newer queued status for the same job supersedes an older one still waiting to sync.
  const next = updates.filter((u) => u.workOrderId !== workOrderId);
  next.push({ workOrderId, status, queuedAt: new Date().toISOString() });
  await setPendingUpdates(next);
}

/**
 * Attempts to push every queued status update to the server. Updates that fail because
 * there's still no connectivity stay queued; updates rejected by the server for another
 * reason (e.g. someone else already moved the job to a conflicting status) are dropped
 * rather than retried forever.
 */
export async function flushPendingUpdates(): Promise<{ succeeded: number; remaining: number }> {
  const updates = await getPendingUpdates();
  if (updates.length === 0) return { succeeded: 0, remaining: 0 };

  const stillPending: PendingStatusUpdate[] = [];
  let succeeded = 0;
  for (const update of updates) {
    try {
      await api.patch(`/work-orders/${update.workOrderId}/status`, { status: update.status });
      succeeded++;
    } catch (err) {
      if (err instanceof NetworkError) {
        stillPending.push(update);
      }
    }
  }
  await setPendingUpdates(stillPending);
  return { succeeded, remaining: stillPending.length };
}
