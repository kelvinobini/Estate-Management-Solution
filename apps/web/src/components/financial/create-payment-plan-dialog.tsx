"use client";

import { useState, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateDialog } from "@/hooks/use-create-dialog";
import { formatNaira, nairaInputToKobo } from "@/lib/format";
import { Plus, X } from "lucide-react";

interface Installment {
  amount: string;
  dueDate: string;
}

function emptyInstallment(): Installment {
  return { amount: "", dueDate: "" };
}

export function CreatePaymentPlanDialog({ invoiceId, balanceKobo }: { invoiceId: string; balanceKobo: string }) {
  const { open, setOpen, error, submitting, submit } = useCreateDialog("/api/payment-plans", "Payment plan created");
  const [installments, setInstallments] = useState<Installment[]>([emptyInstallment(), emptyInstallment()]);

  function updateInstallment(index: number, patch: Partial<Installment>) {
    setInstallments((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function addInstallment() {
    setInstallments((prev) => [...prev, emptyInstallment()]);
  }

  function removeInstallment(index: number) {
    setInstallments((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let installmentsPayload;
    try {
      installmentsPayload = installments.map((item) => ({
        amountDueKobo: nairaInputToKobo(item.amount),
        dueDate: item.dueDate,
      }));
    } catch {
      return;
    }

    const ok = await submit({ invoiceId, installments: installmentsPayload });
    if (ok) {
      setInstallments([emptyInstallment(), emptyInstallment()]);
    }
  }

  const canSubmit = installments.length >= 2 && installments.every((item) => item.amount && item.dueDate);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>Create payment plan</DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Create payment plan</DialogTitle>
            <DialogDescription>
              Split the outstanding balance ({formatNaira(balanceKobo)}) into installments. Amounts must sum exactly
              to the balance.
            </DialogDescription>
          </DialogHeader>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex flex-col gap-3">
            {installments.map((installment, index) => (
              <div key={index} className="flex items-end gap-2">
                <div className="flex flex-1 flex-col gap-2">
                  <Label htmlFor={`amount-${index}`}>Amount (₦)</Label>
                  <Input
                    id={`amount-${index}`}
                    inputMode="decimal"
                    placeholder="0.00"
                    required
                    value={installment.amount}
                    onChange={(e) => updateInstallment(index, { amount: e.target.value })}
                  />
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  <Label htmlFor={`dueDate-${index}`}>Due date</Label>
                  <Input
                    id={`dueDate-${index}`}
                    type="date"
                    required
                    value={installment.dueDate}
                    onChange={(e) => updateInstallment(index, { dueDate: e.target.value })}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={installments.length <= 2}
                  onClick={() => removeInstallment(index)}
                >
                  <X className="size-4" />
                </Button>
              </div>
            ))}
          </div>

          <Button type="button" variant="outline" size="sm" onClick={addInstallment}>
            <Plus className="size-4" />
            Add installment
          </Button>

          <DialogFooter>
            <Button type="submit" disabled={submitting || !canSubmit}>
              {submitting ? "Creating…" : "Create payment plan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
