import { api } from "@/lib/api/server-client";
import { fetchOrForbidden } from "@/lib/api/safe-fetch";
import { ForbiddenNotice } from "@/components/dashboard/forbidden-notice";
import { StatusFilter } from "@/components/dashboard/status-filter";
import { Pagination } from "@/components/dashboard/pagination";
import { CreateIncidentDialog } from "@/components/access/create-incident-dialog";
import { IncidentSeverityBadge } from "@/components/access/incident-severity-badge";
import { IncidentStatusSelect } from "@/components/access/incident-status-select";
import { formatDateTime } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const INCIDENT_STATUSES = ["open", "investigating", "resolved"];

interface Incident {
  id: string;
  property_name: string;
  incident_type: string;
  severity: string;
  description: string;
  status: string;
  occurred_at: string;
}

interface IncidentListResponse {
  rows: Incident[];
  total: number;
  page: number;
  pageSize: number;
}

interface Property {
  id: string;
  name: string;
}

export default async function IncidentsListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = params.page ? Number(params.page) : 1;
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  query.set("page", String(page));
  query.set("pageSize", "20");

  const [{ data, forbidden }, { data: properties }] = await Promise.all([
    fetchOrForbidden(() => api.get<IncidentListResponse>(`/incidents?${query.toString()}`)),
    fetchOrForbidden(() => api.get<Property[]>("/properties")),
  ]);
  const incidents = data?.rows;
  const totalPages = Math.max(Math.ceil((data?.total ?? 0) / (data?.pageSize ?? 20)), 1);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Incidents</h1>
          <p className="text-sm text-muted-foreground">{forbidden ? "" : `${data?.total ?? 0} incidents`}</p>
        </div>
        <div className="flex items-center gap-3">
          {!forbidden && (
            <StatusFilter
              basePath="/dashboard/access/incidents"
              statuses={INCIDENT_STATUSES}
              current={params.status}
            />
          )}
          {!forbidden && <CreateIncidentDialog properties={properties ?? []} />}
        </div>
      </div>

      {forbidden ? (
        <ForbiddenNotice message="You don't have permission to view incidents." />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Security log</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Occurred</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidents?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No incidents found.
                    </TableCell>
                  </TableRow>
                )}
                {incidents?.map((incident) => (
                  <TableRow key={incident.id}>
                    <TableCell className="whitespace-nowrap">{formatDateTime(incident.occurred_at)}</TableCell>
                    <TableCell>{incident.property_name}</TableCell>
                    <TableCell className="capitalize">{incident.incident_type.replace(/_/g, " ")}</TableCell>
                    <TableCell className="max-w-xs truncate">{incident.description}</TableCell>
                    <TableCell>
                      <IncidentSeverityBadge severity={incident.severity} />
                    </TableCell>
                    <TableCell>
                      <IncidentStatusSelect incidentId={incident.id} status={incident.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {!forbidden && (
        <Pagination basePath="/dashboard/access/incidents" page={page} totalPages={totalPages} status={params.status} />
      )}
    </div>
  );
}
