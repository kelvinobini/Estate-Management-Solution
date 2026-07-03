"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatNaira, nairaInputToKobo } from "@/lib/format";

const PAYMENT_METHODS = ["bank_transfer", "cash", "ussd", "wallet", "card", "direct_debit"];

export function RecordPaymentDialog({ invoiceId, balanceKobo }: { invoiceId: string; balanceKobo: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!paymentMethod) {
      setError("Select a payment method");
      return;
    }

    let amountKobo: string;
    try {
      amountKobo = nairaInputToKobo(amount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enter a valid amount");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/financial/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId, amountKobo, paymentMethod, reference: reference || undefined }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? "Unable to record payment");
        return;
      }

      toast.success("Payment recorded");
      setOpen(false);
      setAmount("");
      setReference("");
      setPaymentMethod(null);
      router.refresh();
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>Record payment</DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Record manual payment</DialogTitle>
            <DialogDescription>Outstanding balance: {formatNaira(balanceKobo)}</DialogDescription>
          </DialogHeader>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex flex-col gap-2">
            <Label htmlFor="amount">Amount (₦)</Label>
            <Input
              id="amount"
              inputMode="decimal"
              placeholder="0.00"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="paymentMethod">Payment method</Label>
            <Select value={paymentMethod ?? undefined} onValueChange={setPaymentMethod}>
              <SelectTrigger id="paymentMethod" className="w-full">
                <SelectValue placeholder="Select a method" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method} value={method} className="capitalize">
                    {method.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="reference">Reference (optional)</Label>
            <Input
              id="reference"
              placeholder="Bank teller ref, transaction ID, etc."
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Recording…" : "Record payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
