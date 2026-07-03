import { api } from "@/lib/api/server-client";
import { BackendError } from "@/lib/auth/backend";
import { getSession } from "@/lib/auth/session";
import { formatNaira } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
}

async function loadSummary() {
  try {
    const [occupancy, revenue] = await Promise.all([
      api.get<OccupancySummary>("/reports/occupancy"),
      api.get<RevenueSummary>("/reports/revenue"),
    ]);
    return { occupancy, revenue, forbidden: false };
  } catch (error) {
    if (error instanceof BackendError && error.status === 403) {
      return { occupancy: null, revenue: null, forbidden: true };
    }
    throw error;
  }
}

export default async function DashboardOverviewPage() {
  const session = await getSession();
  const { occupancy, revenue, forbidden } = await loadSummary();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back — signed in as {session?.role}.
        </p>
      </div>

      {forbidden ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            You don&apos;t have permission to view portfolio reports. Use the sidebar to access
            the modules available to your role.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="Total units" value={String(occupancy?.totalUnits ?? 0)} />
          <SummaryCard
            label="Occupancy rate"
            value={`${occupancy?.occupancyRatePercent ?? 0}%`}
          />
          <SummaryCard label="Vacancy rate" value={`${occupancy?.vacancyRatePercent ?? 0}%`} />
          <SummaryCard
            label="Revenue (last 12 months)"
            value={revenue ? formatNaira(revenue.totalRevenueKobo) : "—"}
          />
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
