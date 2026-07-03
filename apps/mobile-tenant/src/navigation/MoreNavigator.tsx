import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MoreScreen } from "../screens/MoreScreen";
import { VehiclesListScreen } from "../screens/VehiclesListScreen";
import { RegisterVehicleScreen } from "../screens/RegisterVehicleScreen";
import { VisitorsListScreen } from "../screens/VisitorsListScreen";
import { RegisterVisitorScreen } from "../screens/RegisterVisitorScreen";
import { VisitorDetailScreen } from "../screens/VisitorDetailScreen";
import { LeaseScreen } from "../screens/LeaseScreen";
import { BookingsListScreen } from "../screens/BookingsListScreen";
import { AmenitiesListScreen } from "../screens/AmenitiesListScreen";
import { CreateBookingScreen } from "../screens/CreateBookingScreen";
import type { MoreStackParamList } from "./types";

const Stack = createNativeStackNavigator<MoreStackParamList>();

export function MoreNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="MoreMenu" component={MoreScreen} options={{ headerShown: false, title: "More" }} />
      <Stack.Screen name="VehiclesList" component={VehiclesListScreen} options={{ title: "Vehicles" }} />
      <Stack.Screen name="RegisterVehicle" component={RegisterVehicleScreen} options={{ title: "Register vehicle" }} />
      <Stack.Screen name="VisitorsList" component={VisitorsListScreen} options={{ title: "Visitors" }} />
      <Stack.Screen name="RegisterVisitor" component={RegisterVisitorScreen} options={{ title: "Register visitor" }} />
      <Stack.Screen name="VisitorDetail" component={VisitorDetailScreen} options={{ title: "Visitor" }} />
      <Stack.Screen name="Lease" component={LeaseScreen} options={{ title: "My lease" }} />
      <Stack.Screen name="BookingsList" component={BookingsListScreen} options={{ title: "Bookings" }} />
      <Stack.Screen name="AmenitiesList" component={AmenitiesListScreen} options={{ title: "Book an amenity" }} />
      <Stack.Screen name="CreateBooking" component={CreateBookingScreen} options={{ title: "New booking" }} />
    </Stack.Navigator>
  );
}
