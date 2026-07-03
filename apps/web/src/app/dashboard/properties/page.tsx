import Link from "next/link";
import { api } from "@/lib/api/server-client";
import { fetchOrForbidden } from "@/lib/api/safe-fetch";
import { ForbiddenNotice } from "@/components/dashboard/forbidden-notice";
import { CreatePropertyDialog } from "@/components/property/create-property-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Property {
  id: string;
  name: string;
  property_type: string;
  city: string;
  state: string;
  year_built: number | null;
}

export default async function PropertiesListPage() {
  const { data: properties, forbidden } = await fetchOrForbidden(() => api.get<Property[]>("/properties"));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Properties</h1>
          <p className="text-sm text-muted-foreground">
            {forbidden ? "" : `${properties?.length ?? 0} properties`}
          </p>
        </div>
        {!forbidden && <CreatePropertyDialog />}
      </div>

      {forbidden ? (
        <ForbiddenNotice message="You don't have permission to view properties." />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Property register</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Year built</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {properties?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No properties yet.
                    </TableCell>
                  </TableRow>
                )}
                {properties?.map((property) => (
                  <TableRow key={property.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/properties/${property.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {property.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {property.property_type.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>{property.city}</TableCell>
                    <TableCell>{property.state}</TableCell>
                    <TableCell>{property.year_built ?? "—"}</TableCell>
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
