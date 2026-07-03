import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { api, ApiError } from "../lib/api/client";
import { formatDate } from "../lib/format";
import { WorkOrderStatusBadge, PriorityBadge } from "../components/StatusBadge";
import type { WorkOrdersStackParamList } from "../navigation/types";

interface WorkOrderDetail {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  opened_at: string;
  closed_at: string | null;
}

type Props = NativeStackScreenProps<WorkOrdersStackParamList, "WorkOrderDetail">;

export function WorkOrderDetailScreen({ route }: Props) {
  const { workOrderId } = route.params;
  const [workOrder, setWorkOrder] = useState<WorkOrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<WorkOrderDetail>(`/work-orders/${workOrderId}`)
      .then(setWorkOrder)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Unable to reach the server."));
  }, [workOrderId]);

  if (error && !workOrder) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.error}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!workOrder) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator style={styles.loading} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{workOrder.title}</Text>
        <View style={styles.badgeRow}>
          <WorkOrderStatusBadge status={workOrder.status} />
          <PriorityBadge priority={workOrder.priority} />
        </View>

        <Text style={styles.meta}>Opened {formatDate(workOrder.opened_at)}</Text>
        {workOrder.closed_at && <Text style={styles.meta}>Closed {formatDate(workOrder.closed_at)}</Text>}

        {workOrder.description && (
          <View style={styles.descriptionBox}>
            <Text style={styles.descriptionLabel}>Description</Text>
            <Text style={styles.description}>{workOrder.description}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 20 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  loading: { marginTop: 40 },
  error: { color: "#dc2626", fontSize: 14, textAlign: "center" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 10 },
  badgeRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  meta: { fontSize: 13, color: "#6b7280", marginBottom: 4 },
  descriptionBox: { marginTop: 20 },
  descriptionLabel: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  description: { fontSize: 15, color: "#374151", lineHeight: 22 },
});
