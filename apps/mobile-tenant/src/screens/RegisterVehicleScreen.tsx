import { useState, type ReactNode } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { api, ApiError } from "../lib/api/client";
import type { MoreStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<MoreStackParamList, "RegisterVehicle">;

export function RegisterVehicleScreen({ navigation }: Props) {
  const [plateNumber, setPlateNumber] = useState("");
  const [makeModel, setMakeModel] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/vehicles", {
        plateNumber: plateNumber.trim(),
        makeModel: makeModel.trim() || undefined,
        permitType: "resident",
        validUntil: validUntil.trim() || undefined,
      });
      navigation.goBack();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to register this vehicle. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = plateNumber.trim().length > 0 && !submitting;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Register a vehicle</Text>

        {error && <Text style={styles.error}>{error}</Text>}

        <Field label="Plate number">
          <TextInput
            style={styles.input}
            autoCapitalize="characters"
            value={plateNumber}
            onChangeText={setPlateNumber}
            placeholder="ABC-123-XY"
          />
        </Field>

        <Field label="Make / model (optional)">
          <TextInput style={styles.input} value={makeModel} onChangeText={setMakeModel} placeholder="e.g. Toyota Camry" />
        </Field>

        <Field label="Permit valid until (optional)">
          <TextInput
            style={styles.input}
            value={validUntil}
            onChangeText={setValidUntil}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
          />
        </Field>

        <TouchableOpacity style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={!canSubmit}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Register</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      {children}
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 20 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 20 },
  error: { color: "#dc2626", fontSize: 14, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6, marginTop: 14 },
  input: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  submitButton: { backgroundColor: "#111827", borderRadius: 8, paddingVertical: 14, alignItems: "center", marginTop: 24 },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
