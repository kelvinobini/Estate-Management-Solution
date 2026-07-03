import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { CheckInScreen } from "../screens/CheckInScreen";
import { GateLogNavigator } from "./GateLogNavigator";
import { MyShiftScreen } from "../screens/MyShiftScreen";
import { IncidentsNavigator } from "./IncidentsNavigator";

const Tab = createBottomTabNavigator();

export function HomeTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Check in" component={CheckInScreen} />
      <Tab.Screen name="Gate log" component={GateLogNavigator} />
      <Tab.Screen name="My shift" component={MyShiftScreen} />
      <Tab.Screen name="Incidents" component={IncidentsNavigator} />
    </Tab.Navigator>
  );
}
