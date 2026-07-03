import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../lib/auth/auth-context";
import { api, ApiError } from "../lib/api/client";
import type { WorkOrdersStackParamList } from "../navigation/types";

interface Lease {
  id: string;
  unit_id: string;
  status: string;
}

const PRIORITIES = ["low", "medium", "high", "emergency"] as const;

type Props = NativeStackScreenProps<WorkOrdersStackParamList, "CreateWorkOrder">;

export function CreateWorkOrderScreen({ navigation }: Props) {
  const { tenant } = useAuth();
  const [unitId, setUnitId] = useState<string | null>(null);
  const [loadingLease, setLoadingLease] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]>("medium");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!tenant) {
      setLoadingLease(false);
      return;
    }
    api
      .get<Lease[]>(`/leases/tenant/${tenant.id}`)
      .then((leases) => {
        const active = leases.find((lease) => lease.status === "active") ?? leases[0];
        setUnitId(active?.unit_id ?? null);
      })
      .catch(() => setUnitId(null))
      .finally(() => setLoadingLease(false));
  }, [tenant]);

  async function handleSubmit() {
    if (!unitId) return;
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/work-orders", { unitId, title: title.trim(), description: description.trim() || undefined, priority });
      navigation.goBack();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingLease) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator style={styles.loading} />
      </SafeAreaView>
    );
  }

  if (!unitId) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>
            You don&apos;t have an active lease on record, so we can&apos;t tell which unit to raise this against.
            Contact your property manager.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const canSubmit = title.trim().length > 0 && !submitting;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Report an issue</Text>

        {error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.field}>
          <Text style={styles.label}>Title</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Leaking kitchen tap" />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Description (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Priority</Text>
          <View style={styles.priorityRow}>
            {PRIORITIES.map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.priorityChip, p === priority && styles.priorityChipActive]}
                onPress={() => setPriority(p)}
              >
                <Text style={[styles.priorityChipText, p === priority && styles.priorityChipTextActive]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={!canSubmit}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Submit</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 20 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  loading: { marginTop: 40 },
  emptyText: { textAlign: "center", color: "#6b7280" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 20 },
  error: { color: "#dc2626", fontSize: 14, marginBottom: 16 },
  field: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  textArea: { height: 100, textAlignVertical: "top" },
  priorityRow: { flexDirection: "row", gap: 8 },
  priorityChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: "#f3f4f6" },
  priorityChipActive: { backgroundColor: "#111827" },
  priorityChipText: { fontSize: 13, color: "#4b5563", textTransform: "capitalize" },
  priorityChipTextActive: { color: "#fff" },
  submitButton: { backgroundColor: "#111827", borderRadius: 8, paddingVertical: 14, alignItems: "center", marginTop: 12 },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
