import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
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
  deposit_amount_kobo: string;
  escalation_percent: string | null;
  break_clause_notice_days: number | null;
  subletting_allowed: boolean;
}

type Props = NativeStackScreenProps<LeasesStackParamList, "LeaseDetail">;

export function LeaseDetailScreen({ route }: Props) {
  const { leaseId, tenantName, unitCode, propertyName } = route.params;
  const [lease, setLease] = useState<Lease | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Lease>(`/leases/${leaseId}`)
      .then(setLease)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Unable to reach the server."));
  }, [leaseId]);

  if (error && !lease) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.error}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!lease) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator style={styles.loading} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{tenantName ?? "Unassigned tenant"}</Text>
          <LeaseStatusBadge status={lease.status} />
        </View>
        <Text style={styles.subtitle}>
          {propertyName} · Unit {unitCode}
        </Text>

        <View style={styles.summaryGrid}>
          <SummaryTile label="Rent" value={`${formatNaira(lease.rent_amount_kobo)} / ${lease.rent_frequency}`} />
          <SummaryTile label="Deposit" value={formatNaira(lease.deposit_amount_kobo)} />
          <SummaryTile label="Start date" value={formatDate(lease.start_date)} />
          <SummaryTile label="End date" value={formatDate(lease.end_date)} />
        </View>

        <Text style={styles.sectionTitle}>Terms</Text>
        <View style={styles.termsCard}>
          <TermRow label="Escalation" value={lease.escalation_percent ? `${lease.escalation_percent}%` : "None"} />
          <TermRow
            label="Break clause notice"
            value={lease.break_clause_notice_days ? `${lease.break_clause_notice_days} days` : "None"}
          />
          <TermRow label="Subletting" value={lease.subletting_allowed ? "Allowed" : "Not allowed"} />
        </View>
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

function TermRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.termRow}>
      <Text style={styles.termLabel}>{label}</Text>
      <Text style={styles.termValue}>{value}</Text>
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
  tileValue: { fontSize: 16, fontWeight: "700", marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  termsCard: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 4 },
  termRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  termLabel: { fontSize: 14, color: "#374151" },
  termValue: { fontSize: 14, fontWeight: "600" },
});
