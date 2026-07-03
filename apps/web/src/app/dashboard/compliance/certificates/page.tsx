import Link from "next/link";
import { api } from "@/lib/api/server-client";
import { fetchOrForbidden } from "@/lib/api/safe-fetch";
import { ForbiddenNotice } from "@/components/dashboard/forbidden-notice";
import { CertificateStatusBadge } from "@/components/compliance/certificate-status-badge";
import { formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Certificate {
  id: string;
  title: string;
  document_type: string;
  expiry_date: string | null;
  complianceStatus: string;
}

export default async function ComplianceCertificatesPage() {
  const { data: certificates, forbidden } = await fetchOrForbidden(() =>
    api.get<Certificate[]>("/compliance/certificates"),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Compliance certificates</h1>
        <p className="text-sm text-muted-foreground">
          Fire safety, insurance, and regulatory certificates across the portfolio.
        </p>
      </div>

      {forbidden ? (
        <ForbiddenNotice message="You don't have permission to view compliance certificates." />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Certificate register</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {certificates?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No compliance certificates on file.
                    </TableCell>
                  </TableRow>
                )}
                {certificates?.map((cert) => (
                  <TableRow key={cert.id}>
                    <TableCell>
                      <Link href={`/dashboard/documents/${cert.id}`} className="font-medium text-primary hover:underline">
                        {cert.title}
                      </Link>
                    </TableCell>
                    <TableCell className="capitalize">{cert.document_type.replace(/_/g, " ")}</TableCell>
                    <TableCell>{cert.expiry_date ? formatDate(cert.expiry_date) : "—"}</TableCell>
                    <TableCell>
                      <CertificateStatusBadge status={cert.complianceStatus} />
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
