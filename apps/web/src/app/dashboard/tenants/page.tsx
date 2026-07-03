import Link from "next/link";
import { api } from "@/lib/api/server-client";
import { fetchOrForbidden } from "@/lib/api/safe-fetch";
import { ForbiddenNotice } from "@/components/dashboard/forbidden-notice";
import { CreateTenantDialog } from "@/components/lease/create-tenant-dialog";
import { KycStatusBadge } from "@/components/lease/kyc-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Tenant {
  id: string;
  full_name: string;
  email: string | null;
  phone: string;
  kyc_status: string;
}

export default async function TenantsListPage() {
  const { data: tenants, forbidden } = await fetchOrForbidden(() => api.get<Tenant[]>("/tenants"));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tenants</h1>
          <p className="text-sm text-muted-foreground">{forbidden ? "" : `${tenants?.length ?? 0} tenants`}</p>
        </div>
        {!forbidden && <CreateTenantDialog />}
      </div>

      {forbidden ? (
        <ForbiddenNotice message="You don't have permission to view tenants." />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tenant register</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>KYC status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No tenants yet.
                    </TableCell>
                  </TableRow>
                )}
                {tenants?.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/tenants/${tenant.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {tenant.full_name}
                      </Link>
                    </TableCell>
                    <TableCell>{tenant.phone}</TableCell>
                    <TableCell>{tenant.email ?? "—"}</TableCell>
                    <TableCell>
                      <KycStatusBadge status={tenant.kyc_status} />
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
