import Link from "next/link";
import { notFound } from "next/navigation";
import { api } from "@/lib/api/server-client";
import { fetchOrForbidden } from "@/lib/api/safe-fetch";
import { BackendError } from "@/lib/auth/backend";
import { formatDate, formatDateTime, formatNaira } from "@/lib/format";
import { KycStatusBadge } from "@/components/lease/kyc-status-badge";
import { KycActions } from "@/components/lease/kyc-actions";
import { LeaseStatusBadge } from "@/components/lease/lease-status-badge";
import { InvoiceStatusBadge } from "@/components/financial/invoice-status-badge";
import { CreateDocumentDialog } from "@/components/documents/create-document-dialog";
import { DocumentsTable } from "@/components/documents/documents-table";
import { EraseTenantDialog } from "@/components/compliance/erase-tenant-dialog";
import { BookingStatusBadge } from "@/components/community/booking-status-badge";
import { CreateVehicleDialog } from "@/components/access/create-vehicle-dialog";
import { RecoveryStageBadge } from "@/components/financial/recovery-stage-badge";
import { GrantPortalAccessDialog } from "@/components/team/grant-portal-access-dialog";
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
import { ArrowLeft } from "lucide-react";

interface Tenant {
  id: string;
  full_name: string;
  email: string | null;
  phone: string;
  kyc_status: string;
  kyc_provider: string | null;
  user_id: string | null;
}

interface Lease {
  id: string;
  unit_id: string;
  status: string;
  start_date: string;
  end_date: string;
  rent_amount_kobo: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_type: string;
  total_kobo: string;
  status: string;
  due_date: string;
}

interface Document {
  id: string;
  title: string;
  document_type: string;
  access_level: string;
  expiry_date: string | null;
}

interface Booking {
  id: string;
  amenity_id: string;
  amenity_name: string;
  start_time: string;
  end_time: string;
  status: string;
}

interface Vehicle {
  id: string;
  plate_number: string;
  make_model: string | null;
  permit_type: string;
  valid_until: string | null;
}

interface Arrear {
  id: string;
  invoice_id: string;
  invoice_number: string;
  outstanding_kobo: string;
  days_overdue: number;
  late_fee_kobo: string;
  recovery_stage: string;
}

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let tenant: Tenant;
  try {
    tenant = await api.get<Tenant>(`/tenants/${id}`);
  } catch (error) {
    if (error instanceof BackendError && error.status === 404) notFound();
    throw error;
  }

  const [leases, invoices, documents] = await Promise.all([
    api.get<Lease[]>(`/leases/tenant/${id}`),
    api.get<Invoice[]>(`/invoices/tenant/${id}`),
    api.get<Document[]>(`/documents/tenant/${id}`),
  ]);
  const { data: bookings, forbidden: bookingsForbidden } = await fetchOrForbidden(() =>
    api.get<Booking[]>(`/bookings/tenant/${id}`),
  );
  const { data: arrears, forbidden: arrearsForbidden } = await fetchOrForbidden(() =>
    api.get<Arrear[]>(`/arrears/tenant/${id}`),
  );
  const { data: vehicles, forbidden: vehiclesForbidden } = await fetchOrForbidden(() =>
    api.get<Vehicle[]>(`/vehicles/tenant/${id}`),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/dashboard/tenants"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to tenants
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{tenant.full_name}</h1>
            <p className="text-sm text-muted-foreground">
              {tenant.phone}
              {tenant.email ? ` — ${tenant.email}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <KycStatusBadge status={tenant.kyc_status} />
            <KycActions tenantId={tenant.id} kycStatus={tenant.kyc_status} />
            <GrantPortalAccessDialog
              tenantId={tenant.id}
              tenantName={tenant.full_name}
              hasPortalAccess={tenant.user_id != null}
            />
            <EraseTenantDialog tenantId={tenant.id} tenantName={tenant.full_name} />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Leases</CardTitle>
          <CardDescription>Lease history for this tenant.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead className="text-right">Rent</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leases.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No leases yet.
                  </TableCell>
                </TableRow>
              )}
              {leases.map((lease) => (
                <TableRow key={lease.id}>
                  <TableCell>
                    <Link href={`/dashboard/leases/${lease.id}`} className="font-medium text-primary hover:underline">
                      {formatDate(lease.start_date)}
                    </Link>
                  </TableCell>
                  <TableCell>{formatDate(lease.end_date)}</TableCell>
                  <TableCell className="text-right">{formatNaira(lease.rent_amount_kobo)}</TableCell>
                  <TableCell>
                    <LeaseStatusBadge status={lease.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invoices</CardTitle>
          <CardDescription>Invoices billed to this tenant.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Due date</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No invoices yet.
                  </TableCell>
                </TableRow>
              )}
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>
                    <Link
                      href={`/dashboard/financial/invoices/${invoice.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {invoice.invoice_number}
                    </Link>
                  </TableCell>
                  <TableCell className="capitalize">{invoice.invoice_type.replace(/_/g, " ")}</TableCell>
                  <TableCell>{formatDate(invoice.due_date)}</TableCell>
                  <TableCell className="text-right">{formatNaira(invoice.total_kobo)}</TableCell>
                  <TableCell>
                    <InvoiceStatusBadge status={invoice.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {!arrearsForbidden && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Arrears</CardTitle>
            <CardDescription>Overdue invoices and recovery status.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead className="text-right">Late fee</TableHead>
                  <TableHead className="text-right">Days overdue</TableHead>
                  <TableHead>Recovery stage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {arrears?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No outstanding arrears.
                    </TableCell>
                  </TableRow>
                )}
                {arrears?.map((arrear) => (
                  <TableRow key={arrear.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/financial/invoices/${arrear.invoice_id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {arrear.invoice_number}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">{formatNaira(arrear.outstanding_kobo)}</TableCell>
                    <TableCell className="text-right">{formatNaira(arrear.late_fee_kobo)}</TableCell>
                    <TableCell className="text-right">{arrear.days_overdue}</TableCell>
                    <TableCell>
                      <RecoveryStageBadge stage={arrear.recovery_stage} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {!bookingsForbidden && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bookings</CardTitle>
            <CardDescription>Amenity bookings made by this tenant.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Amenity</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No bookings yet.
                    </TableCell>
                  </TableRow>
                )}
                {bookings?.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/community/amenities/${booking.amenity_id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {booking.amenity_name}
                      </Link>
                    </TableCell>
                    <TableCell>{formatDateTime(booking.start_time)}</TableCell>
                    <TableCell>{formatDateTime(booking.end_time)}</TableCell>
                    <TableCell>
                      <BookingStatusBadge status={booking.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {!vehiclesForbidden && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Vehicles</CardTitle>
              <CardDescription>Registered vehicles and parking permits for this tenant.</CardDescription>
            </div>
            <CreateVehicleDialog tenantId={id} />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plate number</TableHead>
                  <TableHead>Make / model</TableHead>
                  <TableHead>Permit type</TableHead>
                  <TableHead>Valid until</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No vehicles registered yet.
                    </TableCell>
                  </TableRow>
                )}
                {vehicles?.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell className="font-medium">{vehicle.plate_number}</TableCell>
                    <TableCell>{vehicle.make_model ?? "—"}</TableCell>
                    <TableCell className="capitalize">{vehicle.permit_type}</TableCell>
                    <TableCell>{vehicle.valid_until ? formatDate(vehicle.valid_until) : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Documents</CardTitle>
            <CardDescription>ID documents, signed agreements, and other tenant records.</CardDescription>
          </div>
          <CreateDocumentDialog tenantId={id} />
        </CardHeader>
        <CardContent>
          <DocumentsTable documents={documents} />
        </CardContent>
      </Card>
    </div>
  );
}
