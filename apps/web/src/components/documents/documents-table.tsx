import Link from "next/link";
import { formatDate } from "@/lib/format";
import { AccessLevelBadge } from "@/components/documents/access-level-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DocumentRow {
  id: string;
  title: string;
  document_type: string;
  access_level: string;
  expiry_date: string | null;
}

export function DocumentsTable({ documents }: { documents: DocumentRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Access</TableHead>
          <TableHead>Expiry</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {documents.length === 0 && (
          <TableRow>
            <TableCell colSpan={4} className="text-center text-muted-foreground">
              No documents yet.
            </TableCell>
          </TableRow>
        )}
        {documents.map((document) => (
          <TableRow key={document.id}>
            <TableCell>
              <Link href={`/dashboard/documents/${document.id}`} className="font-medium text-primary hover:underline">
                {document.title}
              </Link>
            </TableCell>
            <TableCell className="capitalize">{document.document_type.replace(/_/g, " ")}</TableCell>
            <TableCell>
              <AccessLevelBadge accessLevel={document.access_level} />
            </TableCell>
            <TableCell>{document.expiry_date ? formatDate(document.expiry_date) : "—"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
