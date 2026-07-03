import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { api, ApiError } from "../lib/api/client";
import { formatDate, formatNaira } from "../lib/format";
import { InvoiceStatusBadge } from "../components/StatusBadge";
import type { InvoicesStackParamList } from "../navigation/types";

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_type: string;
  total_kobo: string;
  amount_paid_kobo: string;
  status: string;
  due_date: string;
  tenant_name: string | null;
  property_name: string;
}

interface InvoicePage {
  rows: Invoice[];
  total: number;
  page: number;
  pageSize: number;
}

type Props = NativeStackScreenProps<InvoicesStackParamList, "InvoicesList">;

export function InvoicesListScreen({ navigation }: Props) {
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await api.get<InvoicePage>("/invoices?pageSize=100");
      setInvoices(data.rows);
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
        <Text style={styles.title}>Rent &amp; invoices</Text>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {invoices === null && !error ? (
        <ActivityIndicator style={styles.loading} />
      ) : (
        <FlatList
          data={invoices ?? []}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>No invoices yet.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate("InvoiceDetail", { invoiceId: item.id })}
            >
              <View style={styles.cardRow}>
                <Text style={styles.cardTitle}>{item.invoice_number}</Text>
                <InvoiceStatusBadge status={item.status} />
              </View>
              <Text style={styles.cardSubtitle}>{item.property_name}</Text>
              <Text style={styles.cardSubtitle}>
                {item.tenant_name ?? "Unassigned tenant"} · Due {formatDate(item.due_date)}
              </Text>
              <Text style={styles.cardAmount}>{formatNaira(item.total_kobo)}</Text>
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
  cardAmount: { fontSize: 18, fontWeight: "700", marginTop: 4 },
});
