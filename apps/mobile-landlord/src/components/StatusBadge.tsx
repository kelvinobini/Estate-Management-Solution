import { StyleSheet, Text, View } from "react-native";

type Variant = "default" | "secondary" | "destructive" | "outline";

const INVOICE_STATUS_VARIANTS: Record<string, Variant> = {
  draft: "outline",
  issued: "secondary",
  partially_paid: "secondary",
  paid: "default",
  overdue: "destructive",
  void: "outline",
};

const LEASE_STATUS_VARIANTS: Record<string, Variant> = {
  draft: "outline",
  pending_signature: "secondary",
  active: "default",
  renewed: "default",
  terminated: "destructive",
  expired: "destructive",
};

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

/** Mirrors apps/web/src/components/financial/invoice-status-badge.tsx's color mapping. */
export function InvoiceStatusBadge({ status }: { status: string }) {
  return <Badge status={status} variants={INVOICE_STATUS_VARIANTS} />;
}

/** Mirrors apps/web/src/components/lease/lease-status-badge.tsx's color mapping. */
export function LeaseStatusBadge({ status }: { status: string }) {
  return <Badge status={status} variants={LEASE_STATUS_VARIANTS} />;
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
