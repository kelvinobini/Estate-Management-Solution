import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { api, ApiError } from "../lib/api/client";
import { formatDate, formatNaira } from "../lib/format";
import type { PropertiesStackParamList } from "../navigation/types";

interface Property {
  id: string;
  name: string;
  property_type: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  total_land_area_sqm: string | null;
  year_built: number | null;
}

interface PropertyYield {
  annualRevenueKobo: string;
  valuationKobo: string | null;
  grossYieldPercent: number | null;
}

interface Occupancy {
  totalUnits: number;
  occupancyRatePercent: number;
  vacancyRatePercent: number;
}

interface MaintenanceCost {
  totalCostKobo: string;
  costPerSqm: number | null;
}

interface Document {
  id: string;
  title: string;
  document_type: string;
  expiry_date: string | null;
  access_level: string;
}

type Props = NativeStackScreenProps<PropertiesStackParamList, "PropertyDetail">;

export function PropertyDetailScreen({ route }: Props) {
  const { propertyId } = route.params;
  const [property, setProperty] = useState<Property | null>(null);
  const [propertyYield, setPropertyYield] = useState<PropertyYield | null>(null);
  const [occupancy, setOccupancy] = useState<Occupancy | null>(null);
  const [maintenanceCost, setMaintenanceCost] = useState<MaintenanceCost | null>(null);
  const [documents, setDocuments] = useState<Document[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Property>(`/properties/${propertyId}`)
      .then(setProperty)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Unable to reach the server."));

    api
      .get<PropertyYield>(`/reports/property-yield/${propertyId}`)
      .then(setPropertyYield)
      .catch(() => undefined);

    api
      .get<Occupancy>(`/reports/occupancy?propertyId=${propertyId}`)
      .then(setOccupancy)
      .catch(() => undefined);

    api
      .get<MaintenanceCost>(`/reports/maintenance-cost?propertyId=${propertyId}`)
      .then(setMaintenanceCost)
      .catch(() => undefined);

    api
      .get<Document[]>(`/documents/property/${propertyId}`)
      .then(setDocuments)
      .catch(() => undefined);
  }, [propertyId]);

  if (error && !property) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.error}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!property) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator style={styles.loading} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{property.name}</Text>
        <Text style={styles.subtitle}>
          {property.address_line1}
          {property.address_line2 ? `, ${property.address_line2}` : ""}, {property.city}, {property.state}
        </Text>

        <View style={styles.grid}>
          <Tile label="Type" value={property.property_type.replace(/_/g, " ")} />
          <Tile label="Year built" value={property.year_built ? String(property.year_built) : "—"} />
          <Tile label="Land area" value={property.total_land_area_sqm ? `${property.total_land_area_sqm} sqm` : "—"} />
          <Tile
            label="Gross yield"
            value={propertyYield?.grossYieldPercent != null ? `${propertyYield.grossYieldPercent}%` : "—"}
          />
        </View>

        {propertyYield?.valuationKobo && (
          <Text style={styles.footnote}>
            Based on trailing 12-month revenue of {formatNaira(propertyYield.annualRevenueKobo)} against a valuation
            of {formatNaira(propertyYield.valuationKobo)}.
          </Text>
        )}

        {(occupancy || maintenanceCost) && (
          <>
            <Text style={styles.sectionTitle}>Performance</Text>
            <View style={styles.grid}>
              {occupancy && (
                <>
                  <Tile label="Occupancy" value={`${occupancy.occupancyRatePercent}%`} />
                  <Tile label="Vacancy" value={`${occupancy.vacancyRatePercent}%`} />
                </>
              )}
              {maintenanceCost && (
                <>
                  <Tile label="Maintenance spend" value={formatNaira(maintenanceCost.totalCostKobo)} />
                  <Tile
                    label="Cost per sqm"
                    value={maintenanceCost.costPerSqm != null ? formatNaira(Math.round(maintenanceCost.costPerSqm)) : "—"}
                  />
                </>
              )}
            </View>
          </>
        )}

        {documents && (
          <>
            <Text style={styles.sectionTitle}>Documents</Text>
            {documents.length === 0 ? (
              <Text style={styles.emptyText}>No documents on file for this property.</Text>
            ) : (
              documents.map((doc) => (
                <View key={doc.id} style={styles.documentRow}>
                  <View style={styles.documentInfo}>
                    <Text style={styles.documentTitle}>{doc.title}</Text>
                    <Text style={styles.documentMeta}>{doc.document_type.replace(/_/g, " ")}</Text>
                  </View>
                  {doc.expiry_date && <Text style={styles.documentMeta}>Expires {formatDate(doc.expiry_date)}</Text>}
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 20 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  loading: { marginTop: 40 },
  error: { color: "#dc2626", fontSize: 14, textAlign: "center" },
  title: { fontSize: 22, fontWeight: "700" },
  subtitle: { fontSize: 14, color: "#6b7280", marginTop: 4, marginBottom: 20 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tile: { width: "47%", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 12 },
  tileLabel: { fontSize: 12, color: "#6b7280", textTransform: "capitalize" },
  tileValue: { fontSize: 16, fontWeight: "700", marginTop: 4, textTransform: "capitalize" },
  footnote: { fontSize: 12, color: "#6b7280", marginTop: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "600", marginTop: 24, marginBottom: 12 },
  emptyText: { fontSize: 13, color: "#6b7280" },
  documentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  documentInfo: { flex: 1, marginRight: 8 },
  documentTitle: { fontSize: 14, fontWeight: "600", color: "#111827" },
  documentMeta: { fontSize: 12, color: "#6b7280", textTransform: "capitalize", marginTop: 2 },
});
