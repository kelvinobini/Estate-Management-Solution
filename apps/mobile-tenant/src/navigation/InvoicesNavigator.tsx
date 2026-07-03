import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { InvoicesListScreen } from "../screens/InvoicesListScreen";
import { InvoiceDetailScreen } from "../screens/InvoiceDetailScreen";
import type { InvoicesStackParamList } from "./types";

const Stack = createNativeStackNavigator<InvoicesStackParamList>();

export function InvoicesNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="InvoicesList" component={InvoicesListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="InvoiceDetail" component={InvoiceDetailScreen} options={{ title: "Invoice" }} />
    </Stack.Navigator>
  );
}
