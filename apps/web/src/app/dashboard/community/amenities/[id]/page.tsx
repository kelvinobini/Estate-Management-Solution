import Link from "next/link";
import { notFound } from "next/navigation";
import { api } from "@/lib/api/server-client";
import { fetchOrForbidden } from "@/lib/api/safe-fetch";
import { BackendError } from "@/lib/auth/backend";
import { formatDateTime, formatNaira } from "@/lib/format";
import { BookingStatusBadge } from "@/components/community/booking-status-badge";
import { CreateBookingDialog } from "@/components/community/create-booking-dialog";
import { CancelBookingButton } from "@/components/community/cancel-booking-button";
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

interface Amenity {
  id: string;
  property_id: string;
  name: string;
  capacity: number | null;
  booking_fee_kobo: string;
}

interface Booking {
  id: string;
  tenant_name: string;
  start_time: string;
  end_time: string;
  status: string;
}

interface Tenant {
  id: string;
  full_name: string;
}

export default async function AmenityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let amenity: Amenity;
  try {
    amenity = await api.get<Amenity>(`/amenities/${id}`);
  } catch (error) {
    if (error instanceof BackendError && error.status === 404) notFound();
    throw error;
  }

  const [{ data: bookings, forbidden }, { data: tenants }] = await Promise.all([
    fetchOrForbidden(() => api.get<Booking[]>(`/bookings/amenity/${id}`)),
    fetchOrForbidden(() => api.get<Tenant[]>("/tenants")),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/dashboard/properties/${amenity.property_id}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to property
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{amenity.name}</h1>
            <p className="text-sm text-muted-foreground">
              {amenity.capacity ? `Capacity: ${amenity.capacity} — ` : ""}
              Booking fee: {formatNaira(amenity.booking_fee_kobo)}
            </p>
          </div>
        </div>
      </div>

      {forbidden ? null : (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Bookings</CardTitle>
              <CardDescription>Booking calendar for this amenity.</CardDescription>
            </div>
            <CreateBookingDialog amenityId={amenity.id} tenants={tenants ?? []} />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No bookings yet.
                    </TableCell>
                  </TableRow>
                )}
                {bookings?.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">{booking.tenant_name}</TableCell>
                    <TableCell>{formatDateTime(booking.start_time)}</TableCell>
                    <TableCell>{formatDateTime(booking.end_time)}</TableCell>
                    <TableCell>
                      <BookingStatusBadge status={booking.status} />
                    </TableCell>
                    <TableCell>
                      {booking.status !== "cancelled" && (
                        <CancelBookingButton bookingId={booking.id} amenityId={amenity.id} />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
