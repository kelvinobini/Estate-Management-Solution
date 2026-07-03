import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../lib/auth/auth-context";
import { api, ApiError } from "../lib/api/client";
import { formatNaira } from "../lib/format";
import type { MoreStackParamList } from "../navigation/types";

interface Lease {
  id: string;
  unit_id: string;
  status: string;
}

interface Amenity {
  id: string;
  name: string;
  capacity: number | null;
  booking_fee_kobo: string;
}

type Props = NativeStackScreenProps<MoreStackParamList, "AmenitiesList">;

export function AmenitiesListScreen({ navigation }: Props) {
  const { tenant } = useAuth();
  const [amenities, setAmenities] = useState<Amenity[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!tenant) return;
    setError(null);
    try {
      const leases = await api.get<Lease[]>(`/leases/tenant/${tenant.id}`);
      const active = leases.find((lease) => lease.status === "active") ?? leases[0];
      if (!active) {
        setError("You don't have an active lease on record, so we can't tell which property to show amenities for.");
        setAmenities([]);
        return;
      }
      const { propertyId } = await api.get<{ propertyId: string }>(`/units/${active.unit_id}/property-id`);
      const data = await api.get<Amenity[]>(`/amenities/property/${propertyId}`);
      setAmenities(data);
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
      {error && <Text style={styles.error}>{error}</Text>}

      {amenities === null && !error ? (
        <ActivityIndicator style={styles.loading} />
      ) : (
        <FlatList
          data={amenities ?? []}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={!error ? <Text style={styles.emptyText}>No bookable amenities yet.</Text> : null}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate("CreateBooking", { amenityId: item.id, amenityName: item.name })}
            >
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardMeta}>
                {item.capacity ? `Capacity ${item.capacity} · ` : ""}
                {formatNaira(item.booking_fee_kobo)} per booking
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
  centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  error: { color: "#dc2626", fontSize: 14, textAlign: "center", marginTop: 16, marginHorizontal: 20 },
  loading: { marginTop: 40 },
  list: { padding: 20, gap: 12 },
  emptyText: { textAlign: "center", color: "#6b7280", marginTop: 40 },
  card: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 14, gap: 4 },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  cardMeta: { fontSize: 13, color: "#6b7280" },
});
