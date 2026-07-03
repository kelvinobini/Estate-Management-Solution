import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../lib/auth/auth-context";
import { LoginScreen } from "../screens/LoginScreen";
import { MfaChallengeScreen } from "../screens/MfaChallengeScreen";
import { JobsNavigator } from "./JobsNavigator";

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {status === "unauthenticated" && <Stack.Screen name="Login" component={LoginScreen} />}
        {status === "mfa_challenge" && <Stack.Screen name="MfaChallenge" component={MfaChallengeScreen} />}
        {status === "authenticated" && <Stack.Screen name="Home" component={JobsNavigator} />}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
