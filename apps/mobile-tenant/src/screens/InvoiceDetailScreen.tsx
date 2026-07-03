import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { api, ApiError } from "../lib/api/client";
import { formatDate, formatNaira } from "../lib/format";
import { InvoiceStatusBadge } from "../components/StatusBadge";
import type { InvoicesStackParamList } from "../navigation/types";

interface LineItem {
  id: string;
  description: string;
  quantity: string;
  unit_price_kobo: string;
  amount_kobo: string;
}

interface InvoiceDetail {
  id: string;
  invoice_number: string;
  invoice_type: string;
  status: string;
  due_date: string;
  subtotal_kobo: string;
  vat_kobo: string;
  total_kobo: string;
  amount_paid_kobo: string;
  lineItems: LineItem[];
}

type Props = NativeStackScreenProps<InvoicesStackParamList, "InvoiceDetail">;

const PAYABLE_STATUSES = new Set(["issued", "partially_paid", "overdue"]);

export function InvoiceDetailScreen({ route }: Props) {
  const { invoiceId } = route.params;
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    api
      .get<InvoiceDetail>(`/invoices/${invoiceId}`)
      .then(setInvoice)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Unable to reach the server."));
  }, [invoiceId]);

  async function handlePay() {
    setError(null);
    setPaying(true);
    try {
      const result = await api.post<{ authorizationUrl: string }>("/payments/paystack/initiate", { invoiceId });
      await Linking.openURL(result.authorizationUrl);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to start payment. Please try again.");
    } finally {
      setPaying(false);
    }
  }

  if (error && !invoice) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.error}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!invoice) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator style={styles.loading} />
      </SafeAreaView>
    );
  }

  const balanceKobo = (BigInt(invoice.total_kobo) - BigInt(invoice.amount_paid_kobo)).toString();
  const canPay = PAYABLE_STATUSES.has(invoice.status) && balanceKobo !== "0";

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{invoice.invoice_number}</Text>
          <InvoiceStatusBadge status={invoice.status} />
        </View>
        <Text style={styles.subtitle}>Due {formatDate(invoice.due_date)}</Text>

        {error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.summaryGrid}>
          <SummaryTile label="Subtotal" value={formatNaira(invoice.subtotal_kobo)} />
          <SummaryTile label="VAT" value={formatNaira(invoice.vat_kobo)} />
          <SummaryTile label="Total" value={formatNaira(invoice.total_kobo)} />
          <SummaryTile label="Balance due" value={formatNaira(balanceKobo)} />
        </View>

        <Text style={styles.sectionTitle}>Line items</Text>
        {invoice.lineItems.map((item) => (
          <View key={item.id} style={styles.lineItem}>
            <Text style={styles.lineItemDescription}>{item.description}</Text>
            <Text style={styles.lineItemAmount}>{formatNaira(item.amount_kobo)}</Text>
          </View>
        ))}

        {canPay && (
          <TouchableOpacity style={[styles.payButton, paying && styles.payButtonDisabled]} onPress={handlePay} disabled={paying}>
            {paying ? <ActivityIndicator color="#fff" /> : <Text style={styles.payButtonText}>Pay {formatNaira(balanceKobo)}</Text>}
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 20 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  loading: { marginTop: 40 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "700" },
  subtitle: { fontSize: 14, color: "#6b7280", marginTop: 4, marginBottom: 20 },
  error: { color: "#dc2626", fontSize: 14, marginBottom: 16 },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 },
  tile: { width: "47%", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 12 },
  tileLabel: { fontSize: 12, color: "#6b7280" },
  tileValue: { fontSize: 18, fontWeight: "700", marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  lineItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  lineItemDescription: { flex: 1, fontSize: 14, color: "#374151" },
  lineItemAmount: { fontSize: 14, fontWeight: "600" },
  payButton: { backgroundColor: "#111827", borderRadius: 8, paddingVertical: 14, alignItems: "center", marginTop: 24 },
  payButtonDisabled: { opacity: 0.5 },
  payButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
