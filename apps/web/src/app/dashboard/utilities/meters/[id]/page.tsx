import Link from "next/link";
import { notFound } from "next/navigation";
import { api } from "@/lib/api/server-client";
import { fetchOrForbidden } from "@/lib/api/safe-fetch";
import { BackendError } from "@/lib/auth/backend";
import { formatDate, formatNaira } from "@/lib/format";
import { RecordReadingDialog } from "@/components/utilities/record-reading-dialog";
import { GenerateUtilityInvoiceDialog } from "@/components/utilities/generate-utility-invoice-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";

interface Meter {
  id: string;
  property_id: string;
  meter_type: string;
  serial_number: string;
  is_bulk_meter: boolean;
  unit_rate_kobo: string;
}

interface Reading {
  id: string;
  reading_value: string;
  reading_source: string;
  read_at: string;
}

interface UtilityInvoice {
  id: string;
  period_start: string;
  period_end: string;
  consumption: string;
  amount_kobo: string;
}

interface Tenant {
  id: string;
  full_name: string;
}

export default async function MeterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let meter: Meter;
  try {
    meter = await api.get<Meter>(`/meters/${id}`);
  } catch (error) {
    if (error instanceof BackendError && error.status === 404) notFound();
    throw error;
  }

  const [readings, utilityInvoices, { data: tenants }] = await Promise.all([
    api.get<Reading[]>(`/meters/${id}/readings`),
    api.get<UtilityInvoice[]>(`/meters/${id}/utility-invoices`),
    fetchOrForbidden(() => api.get<Tenant[]>("/tenants")),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/dashboard/properties/${meter.property_id}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to property
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{meter.serial_number}</h1>
            <p className="text-sm text-muted-foreground">
              Rate: {formatNaira(meter.unit_rate_kobo)} per unit
            </p>
          </div>
          <Badge variant="outline" className="capitalize">
            {meter.meter_type.replace(/_/g, " ")}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Readings</CardTitle>
            <CardDescription>Most recent readings first.</CardDescription>
          </div>
          <RecordReadingDialog meterId={meter.id} />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reading</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Read at</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {readings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No readings yet.
                  </TableCell>
                </TableRow>
              )}
              {readings.map((reading) => (
                <TableRow key={reading.id}>
                  <TableCell>{reading.reading_value}</TableCell>
                  <TableCell className="capitalize">{reading.reading_source.replace(/_/g, " ")}</TableCell>
                  <TableCell>{formatDate(reading.read_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Utility invoices</CardTitle>
            <CardDescription>Billing periods generated from meter readings.</CardDescription>
          </div>
          <GenerateUtilityInvoiceDialog meterId={meter.id} tenants={tenants ?? []} />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Consumption</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {utilityInvoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No utility invoices yet.
                  </TableCell>
                </TableRow>
              )}
              {utilityInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>
                    {formatDate(invoice.period_start)} – {formatDate(invoice.period_end)}
                  </TableCell>
                  <TableCell className="text-right">{invoice.consumption}</TableCell>
                  <TableCell className="text-right">{formatNaira(invoice.amount_kobo)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
