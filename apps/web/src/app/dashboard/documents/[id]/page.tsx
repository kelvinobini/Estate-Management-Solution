import { notFound } from "next/navigation";
import { api } from "@/lib/api/server-client";
import { BackendError } from "@/lib/auth/backend";
import { formatDate } from "@/lib/format";
import { AccessLevelBadge } from "@/components/documents/access-level-badge";
import { UploadVersionDialog } from "@/components/documents/upload-version-dialog";
import { CreateExpiryAlertDialog } from "@/components/documents/create-expiry-alert-dialog";
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

interface DocumentRecord {
  id: string;
  title: string;
  document_type: string;
  access_level: string;
  expiry_date: string | null;
  current_version_id: string | null;
}

interface DocumentVersion {
  id: string;
  version_number: number;
  file_url: string;
  created_at: string;
}

interface ExpiryAlert {
  id: string;
  alert_date: string;
  channel: string;
  sent_at: string | null;
}

export default async function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let record: DocumentRecord;
  try {
    record = await api.get<DocumentRecord>(`/documents/${id}`);
  } catch (error) {
    if (error instanceof BackendError && error.status === 404) notFound();
    throw error;
  }

  const [versions, expiryAlerts] = await Promise.all([
    api.get<DocumentVersion[]>(`/documents/${id}/versions`),
    api.get<ExpiryAlert[]>(`/documents/${id}/expiry-alerts`),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{record.title}</h1>
            <p className="text-sm text-muted-foreground capitalize">
              {record.document_type.replace(/_/g, " ")}
              {record.expiry_date ? ` — expires ${formatDate(record.expiry_date)}` : ""}
            </p>
          </div>
          <AccessLevelBadge accessLevel={record.access_level} />
        </div>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Versions</CardTitle>
            <CardDescription>Immutable version history; the current version is used everywhere the document is referenced.</CardDescription>
          </div>
          <UploadVersionDialog documentId={record.id} />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>Current</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {versions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No versions yet.
                  </TableCell>
                </TableRow>
              )}
              {versions.map((version) => (
                <TableRow key={version.id}>
                  <TableCell>v{version.version_number}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    <a
                      href={version.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {version.file_url}
                    </a>
                  </TableCell>
                  <TableCell>{formatDate(version.created_at)}</TableCell>
                  <TableCell>
                    {version.id === record.current_version_id && <Badge variant="default">Current</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Expiry alerts</CardTitle>
            <CardDescription>Reminders scheduled before this document expires.</CardDescription>
          </div>
          <CreateExpiryAlertDialog documentId={record.id} />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Alert date</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expiryAlerts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No expiry alerts scheduled.
                  </TableCell>
                </TableRow>
              )}
              {expiryAlerts.map((alert) => (
                <TableRow key={alert.id}>
                  <TableCell>{formatDate(alert.alert_date)}</TableCell>
                  <TableCell className="capitalize">{alert.channel.replace(/_/g, " ")}</TableCell>
                  <TableCell>
                    {alert.sent_at ? (
                      <Badge variant="outline">Sent {formatDate(alert.sent_at)}</Badge>
                    ) : (
                      <Badge variant="secondary">Pending</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
