import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, ApiError } from "../lib/api/client";

interface Announcement {
  id: string;
  title: string;
  body: string;
  published_at: string | null;
  created_at: string;
}

interface AnnouncementListResponse {
  rows: Announcement[];
  total: number;
}

/**
 * First real, data-backed screen — proves the auth + API client + token
 * refresh stack works end-to-end. Deliberately the simplest tenant-readable
 * resource (org-wide, read-only, no ownership resolution needed) so it
 * doesn't depend on the tenant-portal-linkage work being exercised too.
 * Invoices/lease/work-orders screens land in follow-up rounds.
 */
export function HomeScreen() {
  const [announcements, setAnnouncements] = useState<Announcement[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await api.get<AnnouncementListResponse>("/announcements?page=1&pageSize=20");
      setAnnouncements(data.rows);
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
        <Text style={styles.title}>Announcements</Text>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {announcements === null && !error ? (
        <ActivityIndicator style={styles.loading} />
      ) : (
        <FlatList
          data={announcements ?? []}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No announcements yet.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardBody}>{item.body}</Text>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  title: { fontSize: 22, fontWeight: "700" },
  error: { color: "#dc2626", fontSize: 14, textAlign: "center", marginTop: 16 },
  loading: { marginTop: 40 },
  list: { padding: 20, gap: 12 },
  empty: { textAlign: "center", color: "#6b7280", marginTop: 40 },
  card: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 14 },
  cardTitle: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  cardBody: { fontSize: 14, color: "#4b5563" },
});
