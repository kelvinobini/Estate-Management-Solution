import Link from "next/link";
import { api } from "@/lib/api/server-client";
import { formatDate, formatNaira } from "@/lib/format";
import { InvoiceStatusBadge } from "@/components/financial/invoice-status-badge";
import { StatusFilter } from "@/components/dashboard/status-filter";
import { Pagination } from "@/components/dashboard/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const INVOICE_STATUSES = ["draft", "issued", "partially_paid", "paid", "overdue", "void"];

interface Invoice {
  id: string;
  invoice_number: string;
  tenant_id: string | null;
  tenant_name: string | null;
  invoice_type: string;
  total_kobo: string;
  amount_paid_kobo: string;
  status: string;
  due_date: string;
}

interface InvoiceListResponse {
  rows: Invoice[];
  total: number;
  page: number;
  pageSize: number;
}

export default async function InvoicesListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = params.page ? Number(params.page) : 1;
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  query.set("page", String(page));
  query.set("pageSize", "20");

  const data = await api.get<InvoiceListResponse>(`/invoices?${query.toString()}`);
  const totalPages = Math.max(Math.ceil(data.total / data.pageSize), 1);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground">{data.total} total invoices</p>
        </div>
        <StatusFilter basePath="/dashboard/financial/invoices" statuses={INVOICE_STATUSES} current={params.status} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invoice register</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Due date</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No invoices found.
                  </TableCell>
                </TableRow>
              )}
              {data.rows.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>
                    <Link
                      href={`/dashboard/financial/invoices/${invoice.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {invoice.invoice_number}
                    </Link>
                  </TableCell>
                  <TableCell>{invoice.tenant_name ?? "—"}</TableCell>
                  <TableCell className="capitalize">{invoice.invoice_type.replace(/_/g, " ")}</TableCell>
                  <TableCell>{formatDate(invoice.due_date)}</TableCell>
                  <TableCell className="text-right">{formatNaira(invoice.total_kobo)}</TableCell>
                  <TableCell className="text-right">{formatNaira(invoice.amount_paid_kobo)}</TableCell>
                  <TableCell>
                    <InvoiceStatusBadge status={invoice.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Pagination basePath="/dashboard/financial/invoices" page={page} totalPages={totalPages} status={params.status} />
    </div>
  );
}
