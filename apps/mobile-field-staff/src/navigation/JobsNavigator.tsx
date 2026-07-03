import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { JobsListScreen } from "../screens/JobsListScreen";
import { JobDetailScreen } from "../screens/JobDetailScreen";
import type { JobsStackParamList } from "./types";

const Stack = createNativeStackNavigator<JobsStackParamList>();

export function JobsNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="JobsList" component={JobsListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="JobDetail" component={JobDetailScreen} options={{ title: "Job" }} />
    </Stack.Navigator>
  );
}
