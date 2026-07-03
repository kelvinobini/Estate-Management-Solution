import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { IncidentsListScreen } from "../screens/IncidentsListScreen";
import { ReportIncidentScreen } from "../screens/ReportIncidentScreen";
import type { IncidentsStackParamList } from "./types";

const Stack = createNativeStackNavigator<IncidentsStackParamList>();

export function IncidentsNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="IncidentsList" component={IncidentsListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ReportIncident" component={ReportIncidentScreen} options={{ title: "Report incident" }} />
    </Stack.Navigator>
  );
}
