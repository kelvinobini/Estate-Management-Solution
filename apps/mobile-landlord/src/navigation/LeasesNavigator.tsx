import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { LeasesListScreen } from "../screens/LeasesListScreen";
import { LeaseDetailScreen } from "../screens/LeaseDetailScreen";
import type { LeasesStackParamList } from "./types";

const Stack = createNativeStackNavigator<LeasesStackParamList>();

export function LeasesNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="LeasesList" component={LeasesListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="LeaseDetail" component={LeaseDetailScreen} options={{ title: "Lease" }} />
    </Stack.Navigator>
  );
}
