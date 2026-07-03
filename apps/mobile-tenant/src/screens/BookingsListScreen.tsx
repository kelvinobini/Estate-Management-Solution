import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../lib/auth/auth-context";
import { api, ApiError } from "../lib/api/client";
import { formatDateTime } from "../lib/format";
import { BookingStatusBadge } from "../components/StatusBadge";
import type { MoreStackParamList } from "../navigation/types";

interface Booking {
  id: string;
  amenity_name: string;
  start_time: string;
  end_time: string;
  status: string;
}

type Props = NativeStackScreenProps<MoreStackParamList, "BookingsList">;

export function BookingsListScreen({ navigation }: Props) {
  const { tenant } = useAuth();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tenant) return;
    setError(null);
    try {
      const data = await api.get<Booking[]>(`/bookings/tenant/${tenant.id}`);
      setBookings(data);
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

  function confirmCancel(bookingId: string) {
    Alert.alert("Cancel booking?", "This can't be undone.", [
      { text: "Keep booking", style: "cancel" },
      { text: "Cancel booking", style: "destructive", onPress: () => handleCancel(bookingId) },
    ]);
  }

  async function handleCancel(bookingId: string) {
    setCancellingId(bookingId);
    try {
      await api.patch(`/bookings/${bookingId}/cancel`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to cancel this booking.");
    } finally {
      setCancellingId(null);
    }
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
        <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate("AmenitiesList")}>
          <Text style={styles.addButtonText}>+ Book amenity</Text>
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {bookings === null && !error ? (
        <ActivityIndicator style={styles.loading} />
      ) : (
        <FlatList
          data={bookings ?? []}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>No bookings yet.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <Text style={styles.cardTitle}>{item.amenity_name}</Text>
                <BookingStatusBadge status={item.status} />
              </View>
              <Text style={styles.cardMeta}>
                {formatDateTime(item.start_time)} – {formatDateTime(item.end_time)}
              </Text>
              {item.status !== "cancelled" && (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => confirmCancel(item.id)}
                  disabled={cancellingId === item.id}
                >
                  {cancellingId === item.id ? (
                    <ActivityIndicator size="small" />
                  ) : (
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  )}
                </TouchableOpacity>
              )}
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
  card: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 14, gap: 6 },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontSize: 16, fontWeight: "700", flex: 1, marginRight: 8 },
  cardMeta: { fontSize: 13, color: "#6b7280" },
  cancelButton: { alignSelf: "flex-start", marginTop: 4 },
  cancelButtonText: { color: "#dc2626", fontSize: 14, fontWeight: "600" },
});
