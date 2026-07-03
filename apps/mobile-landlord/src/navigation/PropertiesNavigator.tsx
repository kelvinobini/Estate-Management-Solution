import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { PropertiesListScreen } from "../screens/PropertiesListScreen";
import { PropertyDetailScreen } from "../screens/PropertyDetailScreen";
import type { PropertiesStackParamList } from "./types";

const Stack = createNativeStackNavigator<PropertiesStackParamList>();

export function PropertiesNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="PropertiesList" component={PropertiesListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PropertyDetail" component={PropertyDetailScreen} options={{ title: "Property" }} />
    </Stack.Navigator>
  );
}
