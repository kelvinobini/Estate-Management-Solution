import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { WorkOrdersListScreen } from "../screens/WorkOrdersListScreen";
import { WorkOrderDetailScreen } from "../screens/WorkOrderDetailScreen";
import type { WorkOrdersStackParamList } from "./types";

const Stack = createNativeStackNavigator<WorkOrdersStackParamList>();

export function WorkOrdersNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="WorkOrdersList" component={WorkOrdersListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="WorkOrderDetail" component={WorkOrderDetailScreen} options={{ title: "Work order" }} />
    </Stack.Navigator>
  );
}
