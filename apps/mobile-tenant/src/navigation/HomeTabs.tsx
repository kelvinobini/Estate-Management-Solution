import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { HomeScreen } from "../screens/HomeScreen";
import { InvoicesNavigator } from "./InvoicesNavigator";
import { WorkOrdersNavigator } from "./WorkOrdersNavigator";
import { MoreNavigator } from "./MoreNavigator";

const Tab = createBottomTabNavigator();

export function HomeTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Announcements" component={HomeScreen} />
      <Tab.Screen name="Invoices" component={InvoicesNavigator} />
      <Tab.Screen name="Work orders" component={WorkOrdersNavigator} />
      <Tab.Screen name="More" component={MoreNavigator} />
    </Tab.Navigator>
  );
}
