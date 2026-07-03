import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, ApiError } from "../lib/api/client";
import { useAuth } from "../lib/auth/auth-context";
import { formatDateTime, formatTime } from "../lib/format";

interface Guard {
  id: string;
  property_id: string;
}

interface Shift {
  id: string;
  shift_start: string;
  shift_end: string;
}

interface PatrolLog {
  id: string;
  checkpoint_name: string;
  logged_at: string;
  notes: string | null;
}

export function MyShiftScreen() {
  const { logout } = useAuth();
  const [guard, setGuard] = useState<Guard | null | undefined>(undefined);
  const [shifts, setShifts] = useState<Shift[] | null>(null);
  const [patrolLogs, setPatrolLogs] = useState<PatrolLog[] | null>(null);
  const [checkpointName, setCheckpointName] = useState("");
  const [logging, setLogging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const activeShift = findActiveShift(shifts);
  const nextShift = findNextShift(shifts);

  const load = useCallback(async () => {
    setError(null);
    try {
      const own = await api.get<Guard>("/guards/me");
      setGuard(own);
      const shiftList = await api.get<Shift[]>(`/guards/${own.id}/shifts`);
      setShifts(shiftList);
      const active = findActiveShift(shiftList);
      if (active) {
        const logs = await api.get<PatrolLog[]>(`/guards/shifts/${active.id}/patrol-logs`);
        setPatrolLogs(logs);
      } else {
        setPatrolLogs(null);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setGuard(null);
        return;
      }
      setError(err instanceof ApiError ? err.message : "Unable to reach the server.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleLogCheckpoint() {
    if (!activeShift || !checkpointName.trim()) return;
    setLogging(true);
    setError(null);
    try {
      await api.post(`/guards/shifts/${activeShift.id}/patrol-logs`, { checkpointName: checkpointName.trim() });
      setCheckpointName("");
      const logs = await api.get<PatrolLog[]>(`/guards/shifts/${activeShift.id}/patrol-logs`);
      setPatrolLogs(logs);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to log checkpoint.");
    } finally {
      setLogging(false);
    }
  }

  if (guard === undefined) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator style={styles.loading} />
      </SafeAreaView>
    );
  }

  if (guard === null) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>My shift</Text>
          <TouchableOpacity onPress={() => logout()}>
            <Text style={styles.signOut}>Sign out</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Your account isn&apos;t assigned to a property yet. Ask your supervisor to assign you.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>My shift</Text>
        <TouchableOpacity onPress={() => logout()}>
          <Text style={styles.signOut}>Sign out</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={patrolLogs ?? []}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            {error && <Text style={styles.error}>{error}</Text>}

            {activeShift ? (
              <View style={styles.shiftCard}>
                <Text style={styles.shiftLabel}>On shift now</Text>
                <Text style={styles.shiftTime}>
                  {formatTime(activeShift.shift_start)} – {formatTime(activeShift.shift_end)}
                </Text>
              </View>
            ) : nextShift ? (
              <View style={styles.shiftCard}>
                <Text style={styles.shiftLabel}>Next shift</Text>
                <Text style={styles.shiftTime}>{formatDateTime(nextShift.shift_start)}</Text>
              </View>
            ) : (
              <Text style={styles.emptyText}>No upcoming shifts scheduled.</Text>
            )}

            {activeShift && (
              <View style={styles.logForm}>
                <Text style={styles.sectionTitle}>Log a checkpoint</Text>
                <View style={styles.logFormRow}>
                  <TextInput
                    style={styles.input}
                    placeholder="Checkpoint name"
                    value={checkpointName}
                    onChangeText={setCheckpointName}
                  />
                  <TouchableOpacity
                    style={[styles.logButton, (!checkpointName.trim() || logging) && styles.buttonDisabled]}
                    onPress={handleLogCheckpoint}
                    disabled={!checkpointName.trim() || logging}
                  >
                    {logging ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Log</Text>}
                  </TouchableOpacity>
                </View>
                <Text style={styles.sectionTitle}>Patrol log</Text>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={activeShift ? <Text style={styles.emptyText}>No checkpoints logged yet this shift.</Text> : null}
        renderItem={({ item }) => (
          <View style={styles.patrolRow}>
            <Text style={styles.patrolName}>{item.checkpoint_name}</Text>
            <Text style={styles.patrolTime}>{formatTime(item.logged_at)}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function findActiveShift(shifts: Shift[] | null): Shift | null {
  if (!shifts) return null;
  const now = Date.now();
  return shifts.find((s) => new Date(s.shift_start).getTime() <= now && now <= new Date(s.shift_end).getTime()) ?? null;
}

function findNextShift(shifts: Shift[] | null): Shift | null {
  if (!shifts) return null;
  const now = Date.now();
  const upcoming = shifts.filter((s) => new Date(s.shift_start).getTime() > now);
  upcoming.sort((a, b) => new Date(a.shift_start).getTime() - new Date(b.shift_start).getTime());
  return upcoming[0] ?? null;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  title: { fontSize: 22, fontWeight: "700" },
  signOut: { color: "#dc2626", fontSize: 14, fontWeight: "600" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  loading: { marginTop: 40 },
  error: { color: "#dc2626", fontSize: 14, textAlign: "center", marginBottom: 12 },
  list: { padding: 20, gap: 8 },
  emptyText: { textAlign: "center", color: "#6b7280", marginTop: 16 },
  shiftCard: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 16 },
  shiftLabel: { fontSize: 13, color: "#6b7280", fontWeight: "600" },
  shiftTime: { fontSize: 20, fontWeight: "700", marginTop: 4 },
  logForm: { marginTop: 24 },
  sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 10 },
  logFormRow: { flexDirection: "row", gap: 8, marginBottom: 24 },
  input: { flex: 1, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  logButton: { backgroundColor: "#111827", borderRadius: 8, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  patrolRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  patrolName: { fontSize: 14, fontWeight: "600" },
  patrolTime: { fontSize: 13, color: "#6b7280" },
});
