import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { api, ApiError, NetworkError } from "../lib/api/client";
import { formatDate, formatNaira } from "../lib/format";
import { getCached, setCached } from "../lib/offline/cache";
import { isPending, queueStatusUpdate } from "../lib/offline/pending-actions";
import { WorkOrderStatusBadge, PriorityBadge } from "../components/StatusBadge";
import type { JobsStackParamList } from "../navigation/types";

/** Mirrors ALLOWED_STATUS_TRANSITIONS in apps/api/src/modules/maintenance/services/work-orders.service.ts. */
const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
  open: ["assigned", "cancelled"],
  assigned: ["in_progress", "cancelled"],
  in_progress: ["on_hold", "closed", "cancelled"],
  on_hold: ["in_progress", "cancelled"],
};

interface WorkOrderDetail {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  cost_kobo: string;
  opened_at: string;
  closed_at: string | null;
  property_name: string | null;
}

interface Part {
  inventory_item_id: string;
  quantity_used: number;
  cost_kobo: string;
}

interface InventoryItem {
  id: string;
  name: string;
  quantity_on_hand: number;
}

type Props = NativeStackScreenProps<JobsStackParamList, "JobDetail">;

export function JobDetailScreen({ route }: Props) {
  const { workOrderId } = route.params;
  const [workOrder, setWorkOrder] = useState<WorkOrderDetail | null>(null);
  const [parts, setParts] = useState<Part[] | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[] | null>(null);
  const [pendingLocal, setPendingLocal] = useState(false);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [partsModalVisible, setPartsModalVisible] = useState(false);

  const cacheKey = `work-order-${workOrderId}`;

  const load = useCallback(async () => {
    try {
      const data = await api.get<WorkOrderDetail>(`/work-orders/${workOrderId}`);
      setWorkOrder(data);
      setOffline(false);
      await setCached(cacheKey, data);
    } catch (err) {
      if (err instanceof NetworkError) {
        const cached = await getCached<WorkOrderDetail>(cacheKey);
        if (cached) {
          setWorkOrder(cached);
          setOffline(true);
          return;
        }
      }
      setError(err instanceof Error ? err.message : "Unable to reach the server.");
    }
    setPendingLocal(await isPending(workOrderId));
  }, [workOrderId, cacheKey]);

  useEffect(() => {
    load();
    api
      .get<Part[]>(`/work-orders/${workOrderId}/parts`)
      .then(setParts)
      .catch(() => undefined);
  }, [load, workOrderId]);

  async function handleTransition(nextStatus: string) {
    if (!workOrder) return;
    setUpdatingStatus(true);
    setError(null);
    const previous = workOrder;
    setWorkOrder({ ...workOrder, status: nextStatus, closed_at: nextStatus === "closed" ? new Date().toISOString() : workOrder.closed_at });
    try {
      const updated = await api.patch<WorkOrderDetail>(`/work-orders/${workOrderId}/status`, { status: nextStatus });
      setWorkOrder(updated);
      await setCached(cacheKey, updated);
      setPendingLocal(false);
    } catch (err) {
      if (err instanceof NetworkError) {
        await queueStatusUpdate(workOrderId, nextStatus);
        await setCached(cacheKey, { ...previous, status: nextStatus });
        setPendingLocal(true);
      } else {
        setWorkOrder(previous);
        setError(err instanceof ApiError ? err.message : "Unable to update status.");
      }
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function openPartsModal() {
    setPartsModalVisible(true);
    if (!inventoryItems) {
      try {
        const items = await api.get<InventoryItem[]>("/inventory-items");
        setInventoryItems(items);
      } catch {
        setInventoryItems([]);
      }
    }
  }

  async function handleLogPart(item: InventoryItem, quantity: number) {
    try {
      await api.post(`/work-orders/${workOrderId}/parts`, { inventoryItemId: item.id, quantityUsed: quantity });
      setPartsModalVisible(false);
      const [updatedWorkOrder, updatedParts] = await Promise.all([
        api.get<WorkOrderDetail>(`/work-orders/${workOrderId}`),
        api.get<Part[]>(`/work-orders/${workOrderId}/parts`),
      ]);
      setWorkOrder(updatedWorkOrder);
      setParts(updatedParts);
      await setCached(cacheKey, updatedWorkOrder);
    } catch (err) {
      if (err instanceof NetworkError) {
        Alert.alert("Offline", "Logging parts requires an internet connection.");
      } else {
        Alert.alert("Couldn't log part", err instanceof ApiError ? err.message : "Please try again.");
      }
    }
  }

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

  const nextStatuses = ALLOWED_STATUS_TRANSITIONS[workOrder.status] ?? [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        {offline && <Text style={styles.offlineBanner}>Offline — showing last synced data</Text>}
        {pendingLocal && <Text style={styles.pendingBanner}>Status change queued — will sync when back online</Text>}

        <Text style={styles.title}>{workOrder.title}</Text>
        <View style={styles.badgeRow}>
          <WorkOrderStatusBadge status={workOrder.status} />
          <PriorityBadge priority={workOrder.priority} />
        </View>

        {workOrder.property_name && <Text style={styles.meta}>{workOrder.property_name}</Text>}
        <Text style={styles.meta}>Opened {formatDate(workOrder.opened_at)}</Text>
        {workOrder.closed_at && <Text style={styles.meta}>Closed {formatDate(workOrder.closed_at)}</Text>}
        {workOrder.cost_kobo !== "0" && <Text style={styles.meta}>Cost so far: {formatNaira(workOrder.cost_kobo)}</Text>}

        {workOrder.description && (
          <View style={styles.descriptionBox}>
            <Text style={styles.descriptionLabel}>Description</Text>
            <Text style={styles.description}>{workOrder.description}</Text>
          </View>
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        {nextStatuses.length > 0 && (
          <View style={styles.actionsBox}>
            <Text style={styles.sectionTitle}>Update status</Text>
            <View style={styles.actionRow}>
              {nextStatuses.map((next) => (
                <TouchableOpacity
                  key={next}
                  style={[styles.actionButton, next === "cancelled" && styles.actionButtonDestructive]}
                  onPress={() => handleTransition(next)}
                  disabled={updatingStatus}
                >
                  <Text
                    style={[styles.actionButtonText, next === "cancelled" && styles.actionButtonTextDestructive]}
                  >
                    {next.replace(/_/g, " ")}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.actionsBox}>
          <View style={styles.partsHeaderRow}>
            <Text style={styles.sectionTitle}>Parts used</Text>
            <TouchableOpacity onPress={openPartsModal}>
              <Text style={styles.linkText}>+ Log part</Text>
            </TouchableOpacity>
          </View>
          {parts && parts.length === 0 && <Text style={styles.meta}>No parts logged yet.</Text>}
          {parts?.map((part) => (
            <View key={part.inventory_item_id} style={styles.partRow}>
              <Text style={styles.meta}>Qty {part.quantity_used}</Text>
              <Text style={styles.meta}>{formatNaira(part.cost_kobo)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <PartsPickerModal
        visible={partsModalVisible}
        items={inventoryItems}
        onClose={() => setPartsModalVisible(false)}
        onSubmit={handleLogPart}
      />
    </SafeAreaView>
  );
}

function PartsPickerModal({
  visible,
  items,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  items: InventoryItem[] | null;
  onClose: () => void;
  onSubmit: (item: InventoryItem, quantity: number) => void;
}) {
  const [selected, setSelected] = useState<InventoryItem | null>(null);
  const [quantity, setQuantity] = useState("1");

  useEffect(() => {
    if (!visible) {
      setSelected(null);
      setQuantity("1");
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.modalHeader}>
          <Text style={styles.title}>Log a part</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.linkText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        {items === null ? (
          <ActivityIndicator style={styles.loading} />
        ) : selected ? (
          <View style={styles.content}>
            <Text style={styles.sectionTitle}>{selected.name}</Text>
            <Text style={styles.meta}>{selected.quantity_on_hand} in stock</Text>
            <Text style={[styles.label, { marginTop: 20 }]}>Quantity used</Text>
            <TextInput style={styles.input} keyboardType="number-pad" value={quantity} onChangeText={setQuantity} />
            <TouchableOpacity
              style={styles.actionButtonFull}
              onPress={() => onSubmit(selected, Math.max(1, Number(quantity) || 1))}
            >
              <Text style={styles.actionButtonFullText}>Log part</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<Text style={styles.emptyText}>No inventory items found.</Text>}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.card} onPress={() => setSelected(item)}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.meta}>{item.quantity_on_hand} in stock</Text>
              </TouchableOpacity>
            )}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 20 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  loading: { marginTop: 40 },
  error: { color: "#dc2626", fontSize: 14, marginBottom: 16 },
  offlineBanner: {
    backgroundColor: "#fef3c7",
    color: "#92400e",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 16,
  },
  pendingBanner: {
    backgroundColor: "#dbeafe",
    color: "#1d4ed8",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 10 },
  badgeRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  meta: { fontSize: 13, color: "#6b7280", marginBottom: 4 },
  descriptionBox: { marginTop: 20 },
  descriptionLabel: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  description: { fontSize: 15, color: "#374151", lineHeight: 22 },
  sectionTitle: { fontSize: 16, fontWeight: "600" },
  actionsBox: { marginTop: 24 },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  actionButton: { backgroundColor: "#111827", borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 },
  actionButtonDestructive: { backgroundColor: "#fee2e2" },
  actionButtonText: { color: "#fff", fontSize: 14, fontWeight: "600", textTransform: "capitalize" },
  actionButtonTextDestructive: { color: "#dc2626" },
  actionButtonFull: { backgroundColor: "#111827", borderRadius: 8, paddingVertical: 14, alignItems: "center", marginTop: 20 },
  actionButtonFullText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  partsHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  linkText: { color: "#2563eb", fontSize: 14, fontWeight: "600" },
  partRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  list: { padding: 20, gap: 12 },
  emptyText: { textAlign: "center", color: "#6b7280", marginTop: 40 },
  card: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 14, gap: 4 },
  cardTitle: { fontSize: 16, fontWeight: "600" },
});
