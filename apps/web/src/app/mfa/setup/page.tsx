"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OctagonAlert } from "lucide-react";

export default function MfaSetupPage() {
  const router = useRouter();

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [provisioningUri, setProvisioningUri] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function enroll() {
      try {
        const response = await fetch("/api/auth/mfa/enroll", { method: "POST" });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message ?? "Unable to start MFA enrollment");
        }
        if (cancelled) return;
        setProvisioningUri(data.provisioningUri);
        setQrDataUrl(await QRCode.toDataURL(data.provisioningUri));
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Unable to start MFA enrollment");
        }
      }
    }

    enroll();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/mfa/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? "Invalid code");
        return;
      }

      router.push("/login?next=%2Fdashboard");
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Set up two-factor authentication</CardTitle>
          <CardDescription>
            Your role requires MFA. Scan this QR code with an authenticator
            app (e.g. Google Authenticator, Authy), then enter the 6-digit
            code it generates.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {loadError && (
            <Alert variant="destructive">
              <OctagonAlert />
              <AlertTitle>Couldn&apos;t start enrollment</AlertTitle>
              <AlertDescription>{loadError}</AlertDescription>
            </Alert>
          )}

          {qrDataUrl && (
            <div className="flex flex-col items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- locally generated data: URL, not an optimizable remote image */}
              <img src={qrDataUrl} alt="MFA enrollment QR code" width={200} height={200} />
              <p className="max-w-full break-all text-center text-xs text-muted-foreground">
                Can&apos;t scan? Enter this manually: {provisioningUri}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <Alert variant="destructive">
                <OctagonAlert />
                <AlertTitle>Confirmation failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="code">Authentication code</Label>
              <Input
                id="code"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              />
            </div>

            <Button type="submit" disabled={submitting || code.length !== 6 || !qrDataUrl}>
              {submitting ? "Confirming…" : "Confirm and finish setup"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
