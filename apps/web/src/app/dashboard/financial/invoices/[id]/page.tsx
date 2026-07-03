import Link from "next/link";
import { notFound } from "next/navigation";
import { api } from "@/lib/api/server-client";
import { fetchOrForbidden } from "@/lib/api/safe-fetch";
import { BackendError } from "@/lib/auth/backend";
import { formatDate, formatNaira } from "@/lib/format";
import { InvoiceStatusBadge } from "@/components/financial/invoice-status-badge";
import { InvoiceActions } from "@/components/financial/invoice-actions";
import { CreatePaymentPlanDialog } from "@/components/financial/create-payment-plan-dialog";
import { InstallmentStatusBadge } from "@/components/financial/installment-status-badge";
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
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";

interface LineItem {
  id: string;
  description: string;
  quantity: string;
  unit_price_kobo: string;
  amount_kobo: string;
}

interface Installment {
  id: string;
  installment_number: number;
  amount_due_kobo: string;
  due_date: string;
  status: string;
}

interface InvoiceDetail {
  id: string;
  invoice_number: string;
  tenant_id: string | null;
  tenant_name: string | null;
  invoice_type: string;
  status: string;
  due_date: string;
  issued_at: string | null;
  subtotal_kobo: string;
  vat_kobo: string;
  total_kobo: string;
  amount_paid_kobo: string;
  lineItems: LineItem[];
}

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let invoice: InvoiceDetail;
  try {
    invoice = await api.get<InvoiceDetail>(`/invoices/${id}`);
  } catch (error) {
    if (error instanceof BackendError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  const balanceKobo = (BigInt(invoice.total_kobo) - BigInt(invoice.amount_paid_kobo)).toString();

  const { data: installments, forbidden: installmentsForbidden } = await fetchOrForbidden(() =>
    api.get<Installment[]>(`/payment-plans/invoice/${id}`),
  );
  const canCreatePlan = balanceKobo !== "0" && invoice.status !== "paid" && invoice.status !== "void";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/dashboard/financial/invoices"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to invoices
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{invoice.invoice_number}</h1>
            <p className="text-sm text-muted-foreground">
              {invoice.tenant_name ?? "No tenant on record"} — due {formatDate(invoice.due_date)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <InvoiceStatusBadge status={invoice.status} />
            <InvoiceActions invoiceId={invoice.id} status={invoice.status} balanceKobo={balanceKobo} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Subtotal" value={formatNaira(invoice.subtotal_kobo)} />
        <SummaryCard label="VAT" value={formatNaira(invoice.vat_kobo)} />
        <SummaryCard label="Total" value={formatNaira(invoice.total_kobo)} />
        <SummaryCard label="Balance due" value={formatNaira(balanceKobo)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Line items</CardTitle>
          <CardDescription>Invoice type: {invoice.invoice_type.replace(/_/g, " ")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Unit price</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.lineItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">{formatNaira(item.unit_price_kobo)}</TableCell>
                  <TableCell className="text-right">{formatNaira(item.amount_kobo)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3}>Subtotal</TableCell>
                <TableCell className="text-right">{formatNaira(invoice.subtotal_kobo)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={3}>VAT</TableCell>
                <TableCell className="text-right">{formatNaira(invoice.vat_kobo)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={3} className="font-medium">
                  Total
                </TableCell>
                <TableCell className="text-right font-medium">{formatNaira(invoice.total_kobo)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      {!installmentsForbidden && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Payment plan</CardTitle>
              <CardDescription>Installments for settling the outstanding balance.</CardDescription>
            </div>
            {canCreatePlan && installments?.length === 0 && (
              <CreatePaymentPlanDialog invoiceId={invoice.id} balanceKobo={balanceKobo} />
            )}
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Due date</TableHead>
                  <TableHead className="text-right">Amount due</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {installments?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No payment plan for this invoice.
                    </TableCell>
                  </TableRow>
                )}
                {installments?.map((installment) => (
                  <TableRow key={installment.id}>
                    <TableCell>{installment.installment_number}</TableCell>
                    <TableCell>{formatDate(installment.due_date)}</TableCell>
                    <TableCell className="text-right">{formatNaira(installment.amount_due_kobo)}</TableCell>
                    <TableCell>
                      <InstallmentStatusBadge status={installment.status} />
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
