import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { GateLogListScreen } from "../screens/GateLogListScreen";
import { GatePassDetailScreen } from "../screens/GatePassDetailScreen";
import type { GateLogStackParamList } from "./types";

const Stack = createNativeStackNavigator<GateLogStackParamList>();

export function GateLogNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="GateLogList" component={GateLogListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="GatePassDetail" component={GatePassDetailScreen} options={{ title: "Gate pass" }} />
    </Stack.Navigator>
  );
}
