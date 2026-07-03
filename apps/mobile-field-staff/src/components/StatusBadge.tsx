import { StyleSheet, Text, View } from "react-native";

type Variant = "default" | "secondary" | "destructive" | "outline";

const WORK_ORDER_STATUS_VARIANTS: Record<string, Variant> = {
  open: "secondary",
  assigned: "secondary",
  in_progress: "default",
  on_hold: "destructive",
  closed: "outline",
  cancelled: "outline",
};

const PRIORITY_VARIANTS: Record<string, Variant> = {
  low: "outline",
  medium: "secondary",
  high: "default",
  emergency: "destructive",
};

const VARIANT_STYLES: Record<Variant, { bg: string; fg: string }> = {
  default: { bg: "#dcfce7", fg: "#15803d" },
  secondary: { bg: "#dbeafe", fg: "#1d4ed8" },
  destructive: { bg: "#fee2e2", fg: "#dc2626" },
  outline: { bg: "#f3f4f6", fg: "#4b5563" },
};

function Badge({ status, variants }: { status: string; variants: Record<string, Variant> }) {
  const variant = variants[status] ?? "outline";
  const { bg, fg } = VARIANT_STYLES[variant];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg }]}>{status.replace(/_/g, " ")}</Text>
    </View>
  );
}

/** Mirrors apps/web/src/components/maintenance/work-order-status-badge.tsx's color mapping. */
export function WorkOrderStatusBadge({ status }: { status: string }) {
  return <Badge status={status} variants={WORK_ORDER_STATUS_VARIANTS} />;
}

/** Mirrors apps/web/src/components/maintenance/priority-badge.tsx's color mapping. */
export function PriorityBadge({ priority }: { priority: string }) {
  return <Badge status={priority} variants={PRIORITY_VARIANTS} />;
}

const styles = StyleSheet.create({
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" },
  text: { fontSize: 12, fontWeight: "600", textTransform: "capitalize" },
});
