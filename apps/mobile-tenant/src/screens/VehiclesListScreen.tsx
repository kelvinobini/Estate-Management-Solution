import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../lib/auth/auth-context";
import { api, ApiError } from "../lib/api/client";
import { formatDate } from "../lib/format";
import type { MoreStackParamList } from "../navigation/types";

interface Vehicle {
  id: string;
  plate_number: string;
  make_model: string | null;
  permit_type: string;
  valid_until: string | null;
}

type Props = NativeStackScreenProps<MoreStackParamList, "VehiclesList">;

export function VehiclesListScreen({ navigation }: Props) {
  const { tenant } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!tenant) return;
    setError(null);
    try {
      const data = await api.get<Vehicle[]>(`/vehicles/tenant/${tenant.id}`);
      setVehicles(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to reach the server.");
    }
  }, [tenant]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (!tenant) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>
            Your account isn&apos;t linked to a tenant record yet. Ask your property manager to grant portal access.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate("RegisterVehicle")}>
          <Text style={styles.addButtonText}>+ Register</Text>
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {vehicles === null && !error ? (
        <ActivityIndicator style={styles.loading} />
      ) : (
        <FlatList
          data={vehicles ?? []}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>No vehicles registered yet.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.plate_number}</Text>
              {item.make_model && <Text style={styles.cardSubtitle}>{item.make_model}</Text>}
              <Text style={styles.cardMeta}>
                {item.permit_type} permit{item.valid_until ? ` · valid until ${formatDate(item.valid_until)}` : ""}
              </Text>
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
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  addButton: { backgroundColor: "#111827", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  addButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  error: { color: "#dc2626", fontSize: 14, textAlign: "center", marginTop: 16 },
  loading: { marginTop: 40 },
  list: { padding: 20, gap: 12 },
  emptyText: { textAlign: "center", color: "#6b7280", marginTop: 40 },
  card: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 14, gap: 2 },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  cardSubtitle: { fontSize: 14, color: "#374151" },
  cardMeta: { fontSize: 13, color: "#6b7280", marginTop: 4, textTransform: "capitalize" },
});
