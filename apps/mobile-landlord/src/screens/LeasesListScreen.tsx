import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { api, ApiError } from "../lib/api/client";
import { formatDate, formatNaira } from "../lib/format";
import { LeaseStatusBadge } from "../components/StatusBadge";
import type { LeasesStackParamList } from "../navigation/types";

interface Lease {
  id: string;
  status: string;
  start_date: string;
  end_date: string;
  rent_amount_kobo: string;
  rent_frequency: string;
  tenant_name: string | null;
  unit_code: string;
  property_name: string;
}

interface LeasePage {
  rows: Lease[];
  total: number;
  page: number;
  pageSize: number;
}

type Props = NativeStackScreenProps<LeasesStackParamList, "LeasesList">;

export function LeasesListScreen({ navigation }: Props) {
  const [leases, setLeases] = useState<Lease[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await api.get<LeasePage>("/leases?pageSize=100");
      setLeases(data.rows);
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
        <Text style={styles.title}>Leases</Text>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {leases === null && !error ? (
        <ActivityIndicator style={styles.loading} />
      ) : (
        <FlatList
          data={leases ?? []}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>No leases yet.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                navigation.navigate("LeaseDetail", {
                  leaseId: item.id,
                  tenantName: item.tenant_name,
                  unitCode: item.unit_code,
                  propertyName: item.property_name,
                })
              }
            >
              <View style={styles.cardRow}>
                <Text style={styles.cardTitle}>{item.tenant_name ?? "Unassigned tenant"}</Text>
                <LeaseStatusBadge status={item.status} />
              </View>
              <Text style={styles.cardSubtitle}>
                {item.property_name} · Unit {item.unit_code}
              </Text>
              <Text style={styles.cardSubtitle}>
                {formatDate(item.start_date)} – {formatDate(item.end_date)}
              </Text>
              <Text style={styles.cardAmount}>
                {formatNaira(item.rent_amount_kobo)} / {item.rent_frequency}
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
  header: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  title: { fontSize: 22, fontWeight: "700" },
  error: { color: "#dc2626", fontSize: 14, textAlign: "center", marginTop: 16 },
  loading: { marginTop: 40 },
  list: { padding: 20, gap: 12 },
  emptyText: { textAlign: "center", color: "#6b7280", marginTop: 40 },
  card: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 14, gap: 4 },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontSize: 16, fontWeight: "600" },
  cardSubtitle: { fontSize: 13, color: "#6b7280" },
  cardAmount: { fontSize: 16, fontWeight: "700", marginTop: 4 },
});
