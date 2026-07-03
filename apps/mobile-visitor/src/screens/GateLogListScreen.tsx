import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { api, ApiError } from "../lib/api/client";
import { formatDateTime } from "../lib/format";
import { GatePassStatusBadge } from "../components/StatusBadge";
import type { GateLogStackParamList } from "../navigation/types";

const STATUSES = ["issued", "checked_in", "checked_out", "expired", "revoked"] as const;

interface GatePass {
  id: string;
  status: string;
  visitor_name: string;
  valid_until: string;
  checked_in_at: string | null;
}

interface GatePassPage {
  rows: GatePass[];
  total: number;
}

type Props = NativeStackScreenProps<GateLogStackParamList, "GateLogList">;

export function GateLogListScreen({ navigation }: Props) {
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("checked_in");
  const [gatePasses, setGatePasses] = useState<GatePass[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await api.get<GatePassPage>(`/gate-passes?status=${status}&page=1&pageSize=50`);
      setGatePasses(data.rows);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to reach the server.");
    }
  }, [status]);

  useEffect(() => {
    setGatePasses(null);
    load();
  }, [load]);

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>Gate log</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs} contentContainerStyle={styles.tabsContent}>
        {STATUSES.map((s) => (
          <TouchableOpacity key={s} style={[styles.tab, s === status && styles.tabActive]} onPress={() => setStatus(s)}>
            <Text style={[styles.tabText, s === status && styles.tabTextActive]}>{s.replace(/_/g, " ")}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {error && <Text style={styles.error}>{error}</Text>}

      {gatePasses === null && !error ? (
        <ActivityIndicator style={styles.loading} />
      ) : (
        <FlatList
          data={gatePasses ?? []}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>No {status.replace(/_/g, " ")} passes.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate("GatePassDetail", { gatePassId: item.id })}
            >
              <View style={styles.cardRow}>
                <Text style={styles.cardTitle}>{item.visitor_name}</Text>
                <GatePassStatusBadge status={item.status} />
              </View>
              <Text style={styles.cardSubtitle}>
                {item.checked_in_at ? `Checked in ${formatDateTime(item.checked_in_at)}` : `Valid until ${formatDateTime(item.valid_until)}`}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  header: { paddingHorizontal: 20, paddingTop: 16 },
  title: { fontSize: 22, fontWeight: "700" },
  tabs: { flexGrow: 0, marginTop: 12, marginBottom: 4 },
  tabsContent: { paddingHorizontal: 20, gap: 8 },
  tab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: "#f3f4f6" },
  tabActive: { backgroundColor: "#111827" },
  tabText: { fontSize: 13, color: "#4b5563", textTransform: "capitalize" },
  tabTextActive: { color: "#fff" },
  error: { color: "#dc2626", fontSize: 14, textAlign: "center", marginTop: 16 },
  loading: { marginTop: 40 },
  list: { padding: 20, gap: 12 },
  emptyText: { textAlign: "center", color: "#6b7280", marginTop: 40 },
  card: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 14, gap: 6 },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontSize: 16, fontWeight: "600", flex: 1, marginRight: 8 },
  cardSubtitle: { fontSize: 13, color: "#6b7280" },
});
