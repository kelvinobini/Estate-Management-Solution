import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { api, ApiError } from "../lib/api/client";
import { formatDate } from "../lib/format";
import { GatePassStatusBadge } from "../components/StatusBadge";
import type { MoreStackParamList } from "../navigation/types";

interface Visitor {
  id: string;
  full_name: string;
  phone: string | null;
  is_blacklisted: boolean;
  blacklist_reason: string | null;
}

interface GatePass {
  id: string;
  otp_code: string;
  status: string;
  valid_from: string;
  valid_until: string;
}

const DURATIONS = [
  { label: "4 hours", hours: 4 },
  { label: "1 day", hours: 24 },
  { label: "1 week", hours: 24 * 7 },
];

type Props = NativeStackScreenProps<MoreStackParamList, "VisitorDetail">;

export function VisitorDetailScreen({ route }: Props) {
  const { visitorId } = route.params;
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [gatePasses, setGatePasses] = useState<GatePass[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [visitorData, passesData] = await Promise.all([
        api.get<Visitor>(`/visitors/${visitorId}`),
        api.get<GatePass[]>(`/visitors/${visitorId}/gate-passes`),
      ]);
      setVisitor(visitorData);
      setGatePasses(passesData);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to reach the server.");
    }
  }, [visitorId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleIssue(hours: number) {
    setError(null);
    setIssuing(true);
    try {
      const validFrom = new Date();
      const validUntil = new Date(validFrom.getTime() + hours * 60 * 60 * 1000);
      await api.post(`/visitors/${visitorId}/gate-passes`, {
        validFrom: validFrom.toISOString(),
        validUntil: validUntil.toISOString(),
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to issue a gate pass. Please try again.");
    } finally {
      setIssuing(false);
    }
  }

  if (error && !visitor) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.error}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!visitor) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator style={styles.loading} />
      </SafeAreaView>
    );
  }

  const activePass = gatePasses?.find((pass) => pass.status === "issued" || pass.status === "checked_in");

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{visitor.full_name}</Text>
        {visitor.phone && <Text style={styles.subtitle}>{visitor.phone}</Text>}

        {visitor.is_blacklisted ? (
          <Text style={styles.blacklisted}>
            This visitor is blacklisted{visitor.blacklist_reason ? `: ${visitor.blacklist_reason}` : "."}
          </Text>
        ) : (
          <>
            {error && <Text style={styles.error}>{error}</Text>}

            {activePass ? (
              <View style={styles.otpCard}>
                <Text style={styles.otpLabel}>Share this code at the gate</Text>
                <Text style={styles.otpCode}>{activePass.otp_code}</Text>
                <Text style={styles.otpMeta}>Valid until {formatDate(activePass.valid_until)}</Text>
              </View>
            ) : (
              <View style={styles.issueSection}>
                <Text style={styles.sectionTitle}>Issue a gate pass</Text>
                <View style={styles.durationRow}>
                  {DURATIONS.map((d) => (
                    <TouchableOpacity
                      key={d.label}
                      style={styles.durationChip}
                      onPress={() => handleIssue(d.hours)}
                      disabled={issuing}
                    >
                      {issuing ? <ActivityIndicator size="small" /> : <Text style={styles.durationChipText}>{d.label}</Text>}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        <Text style={styles.sectionTitle}>History</Text>
        {gatePasses?.length === 0 && <Text style={styles.emptyText}>No gate passes yet.</Text>}
        {gatePasses?.map((pass) => (
          <View key={pass.id} style={styles.historyRow}>
            <Text style={styles.historyCode}>{pass.otp_code}</Text>
            <Text style={styles.historyMeta}>
              {formatDate(pass.valid_from)} – {formatDate(pass.valid_until)}
            </Text>
            <GatePassStatusBadge status={pass.status} />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 20 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  loading: { marginTop: 40 },
  title: { fontSize: 22, fontWeight: "700" },
  subtitle: { fontSize: 14, color: "#6b7280", marginTop: 2, marginBottom: 16 },
  error: { color: "#dc2626", fontSize: 14, marginBottom: 16 },
  blacklisted: { color: "#dc2626", fontSize: 14, marginTop: 8 },
  otpCard: { backgroundColor: "#f3f4f6", borderRadius: 12, padding: 20, alignItems: "center", marginVertical: 16 },
  otpLabel: { fontSize: 13, color: "#6b7280", marginBottom: 8 },
  otpCode: { fontSize: 36, fontWeight: "700", letterSpacing: 4 },
  otpMeta: { fontSize: 13, color: "#6b7280", marginTop: 8 },
  issueSection: { marginTop: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 10, marginTop: 20 },
  durationRow: { flexDirection: "row", gap: 8 },
  durationChip: {
    flex: 1,
    backgroundColor: "#111827",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  durationChipText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  emptyText: { color: "#6b7280", fontSize: 14 },
  historyRow: { borderTopWidth: 1, borderTopColor: "#f3f4f6", paddingVertical: 10, gap: 4 },
  historyCode: { fontSize: 14, fontWeight: "600", fontFamily: "monospace" },
  historyMeta: { fontSize: 12, color: "#6b7280" },
});
