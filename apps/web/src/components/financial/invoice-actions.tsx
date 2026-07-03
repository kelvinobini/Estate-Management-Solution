"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RecordPaymentDialog } from "@/components/financial/record-payment-dialog";
import { issueInvoiceAction, voidInvoiceAction } from "@/app/dashboard/financial/invoices/actions";

interface InvoiceActionsProps {
  invoiceId: string;
  status: string;
  balanceKobo: string;
}

export function InvoiceActions({ invoiceId, status, balanceKobo }: InvoiceActionsProps) {
  const [isPending, startTransition] = useTransition();

  function handleIssue() {
    startTransition(async () => {
      const result = await issueInvoiceAction(invoiceId);
      if (result.ok) {
        toast.success("Invoice issued");
      } else {
        toast.error(result.message ?? "Unable to issue invoice");
      }
    });
  }

  function handleVoid() {
    startTransition(async () => {
      const result = await voidInvoiceAction(invoiceId);
      if (result.ok) {
        toast.success("Invoice voided");
      } else {
        toast.error(result.message ?? "Unable to void invoice");
      }
    });
  }

  const canIssue = status === "draft";
  const canVoid = status !== "paid" && status !== "void";
  const canRecordPayment = status === "issued" || status === "partially_paid" || status === "overdue";

  return (
    <div className="flex flex-wrap gap-2">
      {canIssue && (
        <Button size="sm" variant="outline" onClick={handleIssue} disabled={isPending}>
          Issue invoice
        </Button>
      )}
      {canRecordPayment && <RecordPaymentDialog invoiceId={invoiceId} balanceKobo={balanceKobo} />}
      {canVoid && (
        <Button size="sm" variant="destructive" onClick={handleVoid} disabled={isPending}>
          Void invoice
        </Button>
      )}
    </div>
  );
}
