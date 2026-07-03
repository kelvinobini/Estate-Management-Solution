import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { api, ApiError } from "../lib/api/client";
import { formatDateTime } from "../lib/format";
import { SeverityBadge } from "../components/StatusBadge";
import type { IncidentsStackParamList } from "../navigation/types";

interface Incident {
  id: string;
  incident_type: string;
  severity: string;
  status: string;
  description: string;
  occurred_at: string;
}

interface IncidentPage {
  rows: Incident[];
  total: number;
}

type Props = NativeStackScreenProps<IncidentsStackParamList, "IncidentsList">;

export function IncidentsListScreen({ navigation }: Props) {
  const [incidents, setIncidents] = useState<Incident[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await api.get<IncidentPage>("/incidents?page=1&pageSize=50");
      setIncidents(data.rows);
    } catch (err) {
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>Incidents</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate("ReportIncident")}>
          <Text style={styles.addButtonText}>+ Report</Text>
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {incidents === null && !error ? (
        <ActivityIndicator style={styles.loading} />
      ) : (
        <FlatList
          data={incidents ?? []}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>No incidents reported yet.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <Text style={styles.cardTitle}>{item.incident_type.replace(/_/g, " ")}</Text>
                <SeverityBadge severity={item.severity} />
              </View>
              <Text style={styles.cardDescription} numberOfLines={2}>
                {item.description}
              </Text>
              <View style={styles.cardRow}>
                <Text style={styles.cardSubtitle}>{formatDateTime(item.occurred_at)}</Text>
                <Text style={styles.cardStatus}>{item.status.replace(/_/g, " ")}</Text>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: { fontSize: 22, fontWeight: "700" },
  addButton: { backgroundColor: "#111827", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  addButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  error: { color: "#dc2626", fontSize: 14, textAlign: "center", marginTop: 16 },
  loading: { marginTop: 40 },
  list: { padding: 20, gap: 12 },
  emptyText: { textAlign: "center", color: "#6b7280", marginTop: 40 },
  card: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 14, gap: 6 },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontSize: 16, fontWeight: "600", textTransform: "capitalize", flex: 1, marginRight: 8 },
  cardDescription: { fontSize: 13, color: "#374151" },
  cardSubtitle: { fontSize: 12, color: "#6b7280" },
  cardStatus: { fontSize: 12, color: "#6b7280", textTransform: "capitalize", fontWeight: "600" },
});
