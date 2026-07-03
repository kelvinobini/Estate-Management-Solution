import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../lib/auth/auth-context";
import { api, ApiError } from "../lib/api/client";
import type { PropertiesStackParamList } from "../navigation/types";

interface Property {
  id: string;
  name: string;
  property_type: string;
  address_line1: string;
  city: string;
  state: string;
}

type Props = NativeStackScreenProps<PropertiesStackParamList, "PropertiesList">;

/**
 * The portfolio home screen — GET /properties already scopes to just the
 * caller's own properties for the Landlord role (see PropertiesController),
 * so this needs no client-side filtering the way some tenant-app screens do.
 */
export function PropertiesListScreen({ navigation }: Props) {
  const { logout } = useAuth();
  const [properties, setProperties] = useState<Property[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await api.get<Property[]>("/properties");
      setProperties(data);
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
        <Text style={styles.title}>My properties</Text>
        <TouchableOpacity onPress={() => logout()}>
          <Text style={styles.signOut}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {properties === null && !error ? (
        <ActivityIndicator style={styles.loading} />
      ) : (
        <FlatList
          data={properties ?? []}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              No properties are linked to your account yet. Ask your property manager to assign you as an owner.
            </Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("PropertyDetail", { propertyId: item.id })}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardSubtitle}>
                {item.address_line1}, {item.city}, {item.state}
              </Text>
              <Text style={styles.cardMeta}>{item.property_type.replace(/_/g, " ")}</Text>
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  title: { fontSize: 22, fontWeight: "700" },
  signOut: { color: "#dc2626", fontSize: 14, fontWeight: "600" },
  error: { color: "#dc2626", fontSize: 14, textAlign: "center", marginTop: 16 },
  loading: { marginTop: 40 },
  list: { padding: 20, gap: 12 },
  emptyText: { textAlign: "center", color: "#6b7280", marginTop: 40, paddingHorizontal: 16 },
  card: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 14, gap: 4 },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  cardSubtitle: { fontSize: 13, color: "#6b7280" },
  cardMeta: { fontSize: 12, color: "#9ca3af", textTransform: "capitalize" },
});
