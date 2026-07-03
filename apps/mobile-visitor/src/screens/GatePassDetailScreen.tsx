import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { api, ApiError } from "../lib/api/client";
import { formatDateTime } from "../lib/format";
import { GatePassStatusBadge } from "../components/StatusBadge";
import type { GateLogStackParamList } from "../navigation/types";

interface GatePass {
  id: string;
  visitor_id: string;
  status: string;
  valid_from: string;
  valid_until: string;
  checked_in_at: string | null;
  checked_out_at: string | null;
}

interface Visitor {
  id: string;
  full_name: string;
  phone: string | null;
  is_blacklisted: boolean;
}

type Props = NativeStackScreenProps<GateLogStackParamList, "GatePassDetail">;

export function GatePassDetailScreen({ route }: Props) {
  const { gatePassId } = route.params;
  const [gatePass, setGatePass] = useState<GatePass | null>(null);
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);

  async function load() {
    try {
      const pass = await api.get<GatePass>(`/gate-passes/${gatePassId}`);
      setGatePass(pass);
      const v = await api.get<Visitor>(`/visitors/${pass.visitor_id}`);
      setVisitor(v);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to reach the server.");
    }
  }

  useEffect(() => {
    load();
  }, [gatePassId]);

  async function handleCheckOut() {
    setCheckingOut(true);
    setError(null);
    try {
      const updated = await api.patch<GatePass>(`/gate-passes/${gatePassId}/check-out`);
      setGatePass(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to check out.");
    } finally {
      setCheckingOut(false);
    }
  }

  if (error && !gatePass) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.error}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!gatePass) {
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
          <Text style={styles.title}>{visitor?.full_name ?? "Visitor"}</Text>
          <GatePassStatusBadge status={gatePass.status} />
        </View>
        {visitor?.phone && <Text style={styles.meta}>{visitor.phone}</Text>}
        {visitor?.is_blacklisted && <Text style={styles.blacklistWarning}>This visitor is blacklisted</Text>}

        <View style={styles.summaryGrid}>
          <SummaryTile label="Valid from" value={formatDateTime(gatePass.valid_from)} />
          <SummaryTile label="Valid until" value={formatDateTime(gatePass.valid_until)} />
          <SummaryTile label="Checked in" value={gatePass.checked_in_at ? formatDateTime(gatePass.checked_in_at) : "—"} />
          <SummaryTile label="Checked out" value={gatePass.checked_out_at ? formatDateTime(gatePass.checked_out_at) : "—"} />
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        {gatePass.status === "checked_in" && (
          <TouchableOpacity style={[styles.button, checkingOut && styles.buttonDisabled]} onPress={handleCheckOut} disabled={checkingOut}>
            {checkingOut ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Check out</Text>}
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
  meta: { fontSize: 14, color: "#6b7280", marginTop: 4 },
  blacklistWarning: { fontSize: 13, color: "#dc2626", fontWeight: "600", marginTop: 8 },
  error: { color: "#dc2626", fontSize: 14, marginTop: 16, marginBottom: 8, textAlign: "center" },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 20 },
  tile: { width: "47%", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 12 },
  tileLabel: { fontSize: 12, color: "#6b7280" },
  tileValue: { fontSize: 14, fontWeight: "700", marginTop: 4 },
  button: { backgroundColor: "#111827", borderRadius: 8, paddingVertical: 14, alignItems: "center", marginTop: 24 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
