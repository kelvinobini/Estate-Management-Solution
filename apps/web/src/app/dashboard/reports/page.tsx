import Link from "next/link";
import { api } from "@/lib/api/server-client";
import { fetchOrForbidden } from "@/lib/api/safe-fetch";
import { ForbiddenNotice } from "@/components/dashboard/forbidden-notice";
import { PropertyFilter } from "@/components/reports/property-filter";
import { formatNaira } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface OccupancySummary {
  totalUnits: number;
  byStatus: Record<string, number>;
  occupancyRatePercent: number;
  vacancyRatePercent: number;
}

interface RevenueSummary {
  periodStart: string;
  periodEnd: string;
  totalRevenueKobo: string;
  revenuePerOccupiedUnitKobo: string;
}

interface MaintenanceCostSummary {
  totalCostKobo: string;
  costPerSqm: number | null;
}

interface AverageDaysToLet {
  averageDaysToLet: number | null;
}

interface Property {
  id: string;
  name: string;
}

export default async function ReportsOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ propertyId?: string }>;
}) {
  const params = await searchParams;
  const query = params.propertyId ? `?propertyId=${params.propertyId}` : "";

  const [
    { data: occupancy, forbidden },
    { data: revenue },
    { data: maintenanceCost },
    { data: averageDaysToLet },
    { data: properties },
  ] = await Promise.all([
    fetchOrForbidden(() => api.get<OccupancySummary>(`/reports/occupancy${query}`)),
    fetchOrForbidden(() => api.get<RevenueSummary>(`/reports/revenue${query}`)),
    fetchOrForbidden(() => api.get<MaintenanceCostSummary>(`/reports/maintenance-cost${query}`)),
    fetchOrForbidden(() => api.get<AverageDaysToLet>(`/reports/average-days-to-let${query}`)),
    fetchOrForbidden(() => api.get<Property[]>("/properties")),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">Portfolio performance at a glance.</p>
        </div>
        <div className="flex items-center gap-3">
          {!forbidden && (
            <PropertyFilter basePath="/dashboard/reports" properties={properties ?? []} current={params.propertyId} />
          )}
          <Button variant="outline" size="sm" render={<Link href="/dashboard/reports/rent-roll" />}>
            Rent roll
          </Button>
          <Button variant="outline" size="sm" render={<Link href="/dashboard/reports/aged-debtors" />}>
            Aged debtors
          </Button>
        </div>
      </div>

      {forbidden ? (
        <ForbiddenNotice message="You don't have permission to view reports." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label="Total units" value={String(occupancy?.totalUnits ?? 0)} />
            <SummaryCard label="Occupancy rate" value={`${occupancy?.occupancyRatePercent ?? 0}%`} />
            <SummaryCard label="Vacancy rate" value={`${occupancy?.vacancyRatePercent ?? 0}%`} />
            <SummaryCard
              label="Avg. days to let"
              value={averageDaysToLet?.averageDaysToLet != null ? `${averageDaysToLet.averageDaysToLet} days` : "—"}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SummaryCard
              label="Revenue (trailing 12 months)"
              value={revenue ? formatNaira(revenue.totalRevenueKobo) : "—"}
            />
            <SummaryCard
              label="Revenue per occupied unit"
              value={revenue ? formatNaira(revenue.revenuePerOccupiedUnitKobo) : "—"}
            />
            <SummaryCard
              label="Maintenance spend"
              value={maintenanceCost ? formatNaira(maintenanceCost.totalCostKobo) : "—"}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Units by status</CardTitle>
              <CardDescription>Current occupancy breakdown.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {occupancy &&
                Object.entries(occupancy.byStatus).map(([status, count]) => (
                  <div key={status}>
                    <p className="text-sm capitalize text-muted-foreground">{status.replace(/_/g, " ")}</p>
                    <p className="text-xl font-semibold">{count}</p>
                  </div>
                ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
