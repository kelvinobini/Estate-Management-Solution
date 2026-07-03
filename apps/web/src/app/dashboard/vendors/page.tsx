import { api } from "@/lib/api/server-client";
import { fetchOrForbidden } from "@/lib/api/safe-fetch";
import { ForbiddenNotice } from "@/components/dashboard/forbidden-notice";
import { CreateVendorDialog } from "@/components/maintenance/create-vendor-dialog";
import { VendorStatusBadge } from "@/components/maintenance/vendor-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Vendor {
  id: string;
  company_name: string;
  specialty: string | null;
  phone: string | null;
  performance_score: string | null;
  status: string;
}

export default async function VendorsListPage() {
  const { data: vendors, forbidden } = await fetchOrForbidden(() => api.get<Vendor[]>("/vendors"));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vendors</h1>
          <p className="text-sm text-muted-foreground">{forbidden ? "" : `${vendors?.length ?? 0} vendors`}</p>
        </div>
        {!forbidden && <CreateVendorDialog />}
      </div>

      {forbidden ? (
        <ForbiddenNotice message="You don't have permission to view vendors." />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vendor register</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Specialty</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Performance</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No vendors yet.
                    </TableCell>
                  </TableRow>
                )}
                {vendors?.map((vendor) => (
                  <TableRow key={vendor.id}>
                    <TableCell className="font-medium">{vendor.company_name}</TableCell>
                    <TableCell>{vendor.specialty ?? "—"}</TableCell>
                    <TableCell>{vendor.phone ?? "—"}</TableCell>
                    <TableCell>{vendor.performance_score ? `${vendor.performance_score} / 5` : "—"}</TableCell>
                    <TableCell>
                      <VendorStatusBadge status={vendor.status} />
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
