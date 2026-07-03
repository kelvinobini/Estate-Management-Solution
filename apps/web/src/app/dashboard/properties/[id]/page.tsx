import Link from "next/link";
import { notFound } from "next/navigation";
import { api } from "@/lib/api/server-client";
import { BackendError } from "@/lib/auth/backend";
import { fetchOrForbidden } from "@/lib/api/safe-fetch";
import { CreateBlockDialog } from "@/components/property/create-block-dialog";
import { CreateMeterDialog } from "@/components/utilities/create-meter-dialog";
import { CreateDocumentDialog } from "@/components/documents/create-document-dialog";
import { DocumentsTable } from "@/components/documents/documents-table";
import { CreateAmenityDialog } from "@/components/community/create-amenity-dialog";
import { AssignGuardDialog } from "@/components/access/assign-guard-dialog";
import { CreateAssetDialog } from "@/components/maintenance/create-asset-dialog";
import { AssetStatusBadge } from "@/components/maintenance/asset-status-badge";
import { CreateValuationDialog } from "@/components/property/create-valuation-dialog";
import { AssignPropertyOwnerDialog } from "@/components/property/assign-property-owner-dialog";
import { formatDate, formatNaira } from "@/lib/format";
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

interface Block {
  id: string;
  name: string;
}

interface Meter {
  id: string;
  meter_type: string;
  serial_number: string;
  is_bulk_meter: boolean;
}

interface Document {
  id: string;
  title: string;
  document_type: string;
  access_level: string;
  expiry_date: string | null;
}

interface PropertyYield {
  annualRevenueKobo: string;
  valuationKobo: string | null;
  grossYieldPercent: number | null;
}

interface Amenity {
  id: string;
  name: string;
  capacity: number | null;
  booking_fee_kobo: string;
}

interface Guard {
  id: string;
  user_id: string;
  user_full_name: string;
  user_email: string;
}

interface StaffUser {
  id: string;
  full_name: string;
  role_names: string[];
}

interface Owner {
  id: string;
  full_name: string;
  email: string;
}

interface Asset {
  id: string;
  name: string;
  asset_type: string;
  status: string;
}

interface Valuation {
  id: string;
  valuation_kobo: string;
  valuation_date: string;
  valuer_name: string | null;
  source: string;
}

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let property: Property;
  try {
    property = await api.get<Property>(`/properties/${id}`);
  } catch (error) {
    if (error instanceof BackendError && error.status === 404) notFound();
    throw error;
  }

  const blocks = await api.get<Block[]>(`/properties/${id}/blocks`);
  const { data: meters, forbidden: metersForbidden } = await fetchOrForbidden(() =>
    api.get<Meter[]>(`/meters/property/${id}`),
  );
  const { data: documents, forbidden: documentsForbidden } = await fetchOrForbidden(() =>
    api.get<Document[]>(`/documents/property/${id}`),
  );
  const { data: propertyYield } = await fetchOrForbidden(() =>
    api.get<PropertyYield>(`/reports/property-yield/${id}`),
  );
  const { data: amenities, forbidden: amenitiesForbidden } = await fetchOrForbidden(() =>
    api.get<Amenity[]>(`/amenities/property/${id}`),
  );
  const { data: guards, forbidden: guardsForbidden } = await fetchOrForbidden(() =>
    api.get<Guard[]>(`/guards/property/${id}`),
  );
  const { data: staff } = await fetchOrForbidden(() => api.get<StaffUser[]>("/users"));
  const { data: assets, forbidden: assetsForbidden } = await fetchOrForbidden(() =>
    api.get<Asset[]>(`/assets/property/${id}`),
  );
  const { data: valuations, forbidden: valuationsForbidden } = await fetchOrForbidden(() =>
    api.get<Valuation[]>(`/properties/${id}/valuations`),
  );
  const { data: owners, forbidden: ownersForbidden } = await fetchOrForbidden(() =>
    api.get<Owner[]>(`/properties/${id}/owners`),
  );
  const landlords = (staff ?? []).filter((person) => person.role_names.includes("Landlord"));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/dashboard/properties"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to properties
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{property.name}</h1>
            <p className="text-sm text-muted-foreground">
              {property.address_line1}
              {property.address_line2 ? `, ${property.address_line2}` : ""}, {property.city}, {property.state}
            </p>
          </div>
          <Badge variant="outline" className="capitalize">
            {property.property_type.replace(/_/g, " ")}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Land area" value={property.total_land_area_sqm ? `${property.total_land_area_sqm} sqm` : "—"} />
        <SummaryCard label="Year built" value={property.year_built ? String(property.year_built) : "—"} />
        <SummaryCard label="Blocks" value={String(blocks.length)} />
        <SummaryCard
          label="Gross yield"
          value={propertyYield?.grossYieldPercent != null ? `${propertyYield.grossYieldPercent}%` : "—"}
        />
      </div>

      {propertyYield?.valuationKobo && (
        <p className="-mt-2 text-xs text-muted-foreground">
          Based on trailing 12-month revenue of {formatNaira(propertyYield.annualRevenueKobo)} against a valuation of{" "}
          {formatNaira(propertyYield.valuationKobo)}.
        </p>
      )}

      {!ownersForbidden && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Owners</CardTitle>
              <CardDescription>Landlord accounts linked to this property&apos;s portfolio view.</CardDescription>
            </div>
            <AssignPropertyOwnerDialog propertyId={id} landlords={landlords} />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {owners?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground">
                      No owners assigned yet.
                    </TableCell>
                  </TableRow>
                )}
                {owners?.map((owner) => (
                  <TableRow key={owner.id}>
                    <TableCell className="font-medium">{owner.full_name}</TableCell>
                    <TableCell>{owner.email}</TableCell>
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
            <CardTitle className="text-base">Blocks</CardTitle>
            <CardDescription>Towers, wings, or buildings within this property.</CardDescription>
          </div>
          <CreateBlockDialog propertyId={id} />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {blocks.length === 0 && (
                <TableRow>
                  <TableCell className="text-center text-muted-foreground">No blocks yet.</TableCell>
                </TableRow>
              )}
              {blocks.map((block) => (
                <TableRow key={block.id}>
                  <TableCell>
                    <Link
                      href={`/dashboard/properties/${id}/blocks/${block.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {block.name}
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {!metersForbidden && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Meters</CardTitle>
              <CardDescription>Electricity, water, gas and generator meters on this property.</CardDescription>
            </div>
            <CreateMeterDialog propertyId={id} />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serial number</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Scope</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {meters?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No meters yet.
                    </TableCell>
                  </TableRow>
                )}
                {meters?.map((meter) => (
                  <TableRow key={meter.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/utilities/meters/${meter.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {meter.serial_number}
                      </Link>
                    </TableCell>
                    <TableCell className="capitalize">{meter.meter_type.replace(/_/g, " ")}</TableCell>
                    <TableCell>{meter.is_bulk_meter ? "Bulk" : "Unit"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {!amenitiesForbidden && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Amenities</CardTitle>
              <CardDescription>Bookable facilities on this property.</CardDescription>
            </div>
            <CreateAmenityDialog propertyId={id} />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead className="text-right">Booking fee</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {amenities?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No amenities yet.
                    </TableCell>
                  </TableRow>
                )}
                {amenities?.map((amenity) => (
                  <TableRow key={amenity.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/community/amenities/${amenity.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {amenity.name}
                      </Link>
                    </TableCell>
                    <TableCell>{amenity.capacity ?? "—"}</TableCell>
                    <TableCell className="text-right">{formatNaira(amenity.booking_fee_kobo)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {!guardsForbidden && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Guards</CardTitle>
              <CardDescription>Security staff assigned to this property.</CardDescription>
            </div>
            <AssignGuardDialog propertyId={id} staff={staff ?? []} />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {guards?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground">
                      No guards assigned yet.
                    </TableCell>
                  </TableRow>
                )}
                {guards?.map((guard) => (
                  <TableRow key={guard.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/access/guards/${guard.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {guard.user_full_name}
                      </Link>
                    </TableCell>
                    <TableCell>{guard.user_email}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {!assetsForbidden && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Assets</CardTitle>
              <CardDescription>Elevators, generators, HVAC units and other fixed equipment.</CardDescription>
            </div>
            <CreateAssetDialog propertyId={id} />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No assets registered yet.
                    </TableCell>
                  </TableRow>
                )}
                {assets?.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/maintenance/assets/${asset.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {asset.name}
                      </Link>
                    </TableCell>
                    <TableCell className="capitalize">{asset.asset_type.replace(/_/g, " ")}</TableCell>
                    <TableCell>
                      <AssetStatusBadge status={asset.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {!valuationsForbidden && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Valuations</CardTitle>
              <CardDescription>Recorded property valuations, most recent first.</CardDescription>
            </div>
            <CreateValuationDialog propertyId={id} />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Valuation</TableHead>
                  <TableHead>Valuer</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {valuations?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No valuations recorded yet.
                    </TableCell>
                  </TableRow>
                )}
                {valuations?.map((valuation) => (
                  <TableRow key={valuation.id}>
                    <TableCell>{formatDate(valuation.valuation_date)}</TableCell>
                    <TableCell className="text-right">{formatNaira(valuation.valuation_kobo)}</TableCell>
                    <TableCell>{valuation.valuer_name ?? "—"}</TableCell>
                    <TableCell className="capitalize">{valuation.source.replace(/_/g, " ")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {!documentsForbidden && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Documents</CardTitle>
              <CardDescription>Insurance certificates, safety certs, and other property records.</CardDescription>
            </div>
            <CreateDocumentDialog propertyId={id} />
          </CardHeader>
          <CardContent>
            <DocumentsTable documents={documents ?? []} />
          </CardContent>
        </Card>
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
