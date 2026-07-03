import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { PropertiesNavigator } from "./PropertiesNavigator";
import { InvoicesNavigator } from "./InvoicesNavigator";
import { LeasesNavigator } from "./LeasesNavigator";
import { WorkOrdersNavigator } from "./WorkOrdersNavigator";

const Tab = createBottomTabNavigator();

export function HomeTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Portfolio" component={PropertiesNavigator} />
      <Tab.Screen name="Rent" component={InvoicesNavigator} />
      <Tab.Screen name="Leases" component={LeasesNavigator} />
      <Tab.Screen name="Maintenance" component={WorkOrdersNavigator} />
    </Tab.Navigator>
  );
}
