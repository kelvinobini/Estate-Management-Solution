import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../lib/auth/auth-context";
import { api, ApiError } from "../lib/api/client";
import type { MoreStackParamList } from "../navigation/types";

interface Visitor {
  id: string;
  full_name: string;
  phone: string | null;
  is_blacklisted: boolean;
}

type Props = NativeStackScreenProps<MoreStackParamList, "VisitorsList">;

export function VisitorsListScreen({ navigation }: Props) {
  const { tenant } = useAuth();
  const [visitors, setVisitors] = useState<Visitor[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!tenant) return;
    setError(null);
    try {
      const data = await api.get<Visitor[]>(`/visitors/host/${tenant.id}`);
      setVisitors(data);
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
        <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate("RegisterVisitor")}>
          <Text style={styles.addButtonText}>+ Register</Text>
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {visitors === null && !error ? (
        <ActivityIndicator style={styles.loading} />
      ) : (
        <FlatList
          data={visitors ?? []}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>No visitors registered yet.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("VisitorDetail", { visitorId: item.id })}>
              <View style={styles.cardRow}>
                <Text style={styles.cardTitle}>{item.full_name}</Text>
                {item.is_blacklisted && <Text style={styles.blacklisted}>Blacklisted</Text>}
              </View>
              {item.phone && <Text style={styles.cardSubtitle}>{item.phone}</Text>}
            </TouchableOpacity>
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
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  cardSubtitle: { fontSize: 14, color: "#6b7280" },
  blacklisted: { fontSize: 12, fontWeight: "600", color: "#dc2626" },
});
