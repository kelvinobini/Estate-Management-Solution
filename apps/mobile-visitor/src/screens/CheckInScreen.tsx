import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, ApiError } from "../lib/api/client";
import { useAuth } from "../lib/auth/auth-context";
import { formatTime } from "../lib/format";

interface GatePass {
  id: string;
  visitor_id: string;
  status: string;
  checked_in_at: string | null;
}

interface Visitor {
  id: string;
  full_name: string;
  phone: string | null;
}

export function CheckInScreen() {
  const { logout } = useAuth();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ gatePass: GatePass; visitor: Visitor } | null>(null);

  async function handleCheckIn() {
    if (!code.trim()) return;
    setError(null);
    setSubmitting(true);
    try {
      const gatePass = await api.post<GatePass>("/gate-passes/check-in", { identifier: code.trim() });
      const visitor = await api.get<Visitor>(`/visitors/${gatePass.visitor_id}`);
      setResult({ gatePass, visitor });
      setCode("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to reach the server.");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setResult(null);
    setError(null);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>Check in</Text>
        <TouchableOpacity onPress={() => logout()}>
          <Text style={styles.signOut}>Sign out</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
        {result ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>Checked in</Text>
            <Text style={styles.resultName}>{result.visitor.full_name}</Text>
            {result.visitor.phone && <Text style={styles.resultMeta}>{result.visitor.phone}</Text>}
            {result.gatePass.checked_in_at && (
              <Text style={styles.resultMeta}>at {formatTime(result.gatePass.checked_in_at)}</Text>
            )}
            <TouchableOpacity style={[styles.button, styles.resultButton]} onPress={reset}>
              <Text style={styles.buttonText}>Scan next visitor</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.subtitle}>Enter the visitor's OTP code or scan their QR pass.</Text>

            {error && <Text style={styles.error}>{error}</Text>}

            <TextInput
              style={styles.input}
              placeholder="6-digit code"
              keyboardType="number-pad"
              value={code}
              onChangeText={setCode}
              autoFocus
            />

            <TouchableOpacity
              style={[styles.button, (!code.trim() || submitting) && styles.buttonDisabled]}
              onPress={handleCheckIn}
              disabled={!code.trim() || submitting}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Check in</Text>}
            </TouchableOpacity>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  title: { fontSize: 22, fontWeight: "700" },
  signOut: { color: "#dc2626", fontSize: 14, fontWeight: "600" },
  container: { flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  subtitle: { fontSize: 14, color: "#6b7280", textAlign: "center", marginBottom: 24 },
  error: { color: "#dc2626", fontSize: 14, marginBottom: 12, textAlign: "center" },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 24,
    textAlign: "center",
    letterSpacing: 6,
    marginBottom: 16,
  },
  button: { backgroundColor: "#111827", borderRadius: 8, paddingVertical: 14, alignItems: "center" },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  resultCard: { alignItems: "center", gap: 4 },
  resultLabel: { fontSize: 13, color: "#15803d", fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 },
  resultName: { fontSize: 26, fontWeight: "700", marginTop: 8 },
  resultMeta: { fontSize: 14, color: "#6b7280" },
  resultButton: { marginTop: 32, width: "100%" },
});
