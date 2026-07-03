import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../lib/auth/auth-context";
import type { MoreStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<MoreStackParamList, "MoreMenu">;

/** A menu hub rather than growing the bottom tab bar indefinitely — every secondary feature lives here instead of becoming its own top-level tab. */
export function MoreScreen({ navigation }: Props) {
  const { tenant, logout } = useAuth();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>More</Text>
        {tenant && <Text style={styles.subtitle}>{tenant.fullName}</Text>}
      </View>

      <View style={styles.menu}>
        <MenuItem label="My lease" onPress={() => navigation.navigate("Lease")} />
        <MenuItem label="Bookings" onPress={() => navigation.navigate("BookingsList")} />
        <MenuItem label="Vehicles" onPress={() => navigation.navigate("VehiclesList")} />
        <MenuItem label="Visitors" onPress={() => navigation.navigate("VisitorsList")} />
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={() => logout()}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function MenuItem({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Text style={styles.menuItemText}>{label}</Text>
      <Text style={styles.menuItemChevron}>{">"}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  header: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  title: { fontSize: 22, fontWeight: "700" },
  subtitle: { fontSize: 14, color: "#6b7280", marginTop: 2 },
  menu: { marginTop: 12 },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  menuItemText: { fontSize: 16, color: "#111827" },
  menuItemChevron: { fontSize: 16, color: "#9ca3af" },
  signOutButton: { marginTop: "auto", marginHorizontal: 20, marginBottom: 20, alignItems: "center", paddingVertical: 14 },
  signOutText: { color: "#dc2626", fontSize: 16, fontWeight: "600" },
});
