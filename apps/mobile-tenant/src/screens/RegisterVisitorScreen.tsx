import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { api, ApiError } from "../lib/api/client";
import type { MoreStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<MoreStackParamList, "RegisterVisitor">;

export function RegisterVisitorScreen({ navigation }: Props) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const visitor = await api.post<{ id: string }>("/visitors", {
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
      });
      navigation.replace("VisitorDetail", { visitorId: visitor.id });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to register this visitor. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = fullName.trim().length > 0 && !submitting;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Register a visitor</Text>

        {error && <Text style={styles.error}>{error}</Text>}

        <Text style={styles.label}>Full name</Text>
        <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Guest's full name" />

        <Text style={styles.label}>Phone (optional)</Text>
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

        <TouchableOpacity style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={!canSubmit}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Register</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
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
