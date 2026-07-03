import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { api, ApiError } from "../lib/api/client";
import type { MoreStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<MoreStackParamList, "CreateBooking">;

export function CreateBookingScreen({ route, navigation }: Props) {
  const { amenityId, amenityName } = route.params;
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    const start = new Date(`${date}T${startTime}:00`);
    const end = new Date(`${date}T${endTime}:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setError("Enter a valid date (YYYY-MM-DD) and times (HH:MM).");
      return;
    }
    if (end <= start) {
      setError("End time must be after start time.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/bookings", { amenityId, startTime: start.toISOString(), endTime: end.toISOString() });
      navigation.navigate("BookingsList");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to create this booking. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = date.trim() && startTime.trim() && endTime.trim() && !submitting;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Book {amenityName}</Text>

        {error && <Text style={styles.error}>{error}</Text>}

        <Text style={styles.label}>Date</Text>
        <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />

        <Text style={styles.label}>Start time</Text>
        <TextInput style={styles.input} value={startTime} onChangeText={setStartTime} placeholder="HH:MM" keyboardType="numbers-and-punctuation" />

        <Text style={styles.label}>End time</Text>
        <TextInput style={styles.input} value={endTime} onChangeText={setEndTime} placeholder="HH:MM" keyboardType="numbers-and-punctuation" />

        <TouchableOpacity style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={!canSubmit}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Book</Text>}
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
