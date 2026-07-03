import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { api, ApiError } from "../lib/api/client";
import type { IncidentsStackParamList } from "../navigation/types";

const INCIDENT_TYPES = ["security_breach", "theft", "fire", "altercation", "medical", "other"] as const;
const SEVERITIES = ["low", "medium", "high", "critical"] as const;

type Props = NativeStackScreenProps<IncidentsStackParamList, "ReportIncident">;

export function ReportIncidentScreen({ navigation }: Props) {
  const [incidentType, setIncidentType] = useState<(typeof INCIDENT_TYPES)[number]>("security_breach");
  const [severity, setSeverity] = useState<(typeof SEVERITIES)[number]>("low");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!description.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      // propertyId is resolved server-side from the caller's own guard assignment — see IncidentsController.create.
      await api.post("/incidents", { incidentType, severity, description: description.trim() });
      navigation.goBack();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to reach the server.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Report an incident</Text>

        {error && <Text style={styles.error}>{error}</Text>}

        <Text style={styles.label}>Type</Text>
        <View style={styles.chipRow}>
          {INCIDENT_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.chip, type === incidentType && styles.chipActive]}
              onPress={() => setIncidentType(type)}
            >
              <Text style={[styles.chipText, type === incidentType && styles.chipTextActive]}>{type.replace(/_/g, " ")}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Severity</Text>
        <View style={styles.chipRow}>
          {SEVERITIES.map((sev) => (
            <TouchableOpacity
              key={sev}
              style={[styles.chip, sev === severity && styles.chipActive]}
              onPress={() => setSeverity(sev)}
            >
              <Text style={[styles.chipText, sev === severity && styles.chipTextActive]}>{sev}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={styles.textarea}
          multiline
          numberOfLines={5}
          placeholder="What happened?"
          value={description}
          onChangeText={setDescription}
        />

        <TouchableOpacity
          style={[styles.button, (!description.trim() || submitting) && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={!description.trim() || submitting}
        >
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Submit report</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 20 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 16 },
  error: { color: "#dc2626", fontSize: 14, marginBottom: 16, textAlign: "center" },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 8, marginTop: 16 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: "#f3f4f6" },
  chipActive: { backgroundColor: "#111827" },
  chipText: { fontSize: 13, color: "#4b5563", textTransform: "capitalize" },
  chipTextActive: { color: "#fff" },
  textarea: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    minHeight: 120,
    textAlignVertical: "top",
  },
  button: { backgroundColor: "#111827", borderRadius: 8, paddingVertical: 14, alignItems: "center", marginTop: 24 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
