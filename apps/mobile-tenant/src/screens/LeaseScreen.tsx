import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../lib/auth/auth-context";
import { api, ApiError } from "../lib/api/client";
import { formatDate, formatNaira } from "../lib/format";
import { LeaseStatusBadge } from "../components/StatusBadge";

interface Lease {
  id: string;
  unit_id: string;
  status: string;
  start_date: string;
  end_date: string;
  rent_amount_kobo: string;
  rent_frequency: string;
  deposit_amount_kobo: string;
  escalation_percent: string | null;
  subletting_allowed: boolean;
}

interface Unit {
  id: string;
  unit_code: string;
}

export function LeaseScreen() {
  const { tenant } = useAuth();
  const [lease, setLease] = useState<Lease | null>(null);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenant) {
      setLoading(false);
      return;
    }
    api
      .get<Lease[]>(`/leases/tenant/${tenant.id}`)
      .then(async (leases) => {
        const current = leases.find((l) => l.status === "active") ?? leases[0] ?? null;
        setLease(current);
        if (current) {
          const unitData = await api.get<Unit>(`/units/${current.unit_id}`);
          setUnit(unitData);
        }
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Unable to reach the server."))
      .finally(() => setLoading(false));
  }, [tenant]);

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

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator style={styles.loading} />
      </SafeAreaView>
    );
  }

  if (error || !lease) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>{error ?? "No lease on record yet."}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{unit?.unit_code ?? "Your lease"}</Text>
          <LeaseStatusBadge status={lease.status} />
        </View>

        <View style={styles.grid}>
          <Tile label="Start date" value={formatDate(lease.start_date)} />
          <Tile label="End date" value={formatDate(lease.end_date)} />
          <Tile label="Rent" value={`${formatNaira(lease.rent_amount_kobo)} / ${lease.rent_frequency}`} />
          <Tile label="Deposit" value={formatNaira(lease.deposit_amount_kobo)} />
        </View>

        <Text style={styles.sectionTitle}>Terms</Text>
        <Row label="Escalation" value={lease.escalation_percent ? `${lease.escalation_percent}% per renewal` : "None"} />
        <Row label="Subletting allowed" value={lease.subletting_allowed ? "Yes" : "No"} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue}>{value}</Text>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 20 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  loading: { marginTop: 40 },
  emptyText: { textAlign: "center", color: "#6b7280" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title: { fontSize: 22, fontWeight: "700" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 },
  tile: { width: "47%", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 12 },
  tileLabel: { fontSize: 12, color: "#6b7280" },
  tileValue: { fontSize: 16, fontWeight: "700", marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  rowLabel: { fontSize: 14, color: "#6b7280" },
  rowValue: { fontSize: 14, fontWeight: "600" },
});
