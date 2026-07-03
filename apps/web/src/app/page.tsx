import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RequestAccessForm } from "@/components/landing/request-access-form";
import { HeroIllustration } from "@/components/landing/hero-illustration";
import {
  Building2,
  Wallet,
  Wrench,
  ShieldCheck,
  FileCheck2,
  BarChart3,
  ArrowRight,
} from "lucide-react";

const FEATURES = [
  {
    icon: Building2,
    title: "Tenant portal",
    description: "Residents view their lease, raise maintenance requests, book amenities, and manage visitors from one place.",
    badge: "bg-gradient-to-br from-sky-400 to-blue-600",
    href: "/dashboard/tenants",
  },
  {
    icon: Wallet,
    title: "Rent & payments",
    description: "Naira-denominated invoicing with Paystack checkout, automated arrears tracking, and payment plans.",
    badge: "bg-gradient-to-br from-emerald-400 to-green-600",
    href: "/dashboard/financial/invoices",
  },
  {
    icon: Wrench,
    title: "Maintenance & work orders",
    description: "Log issues, assign them to in-house staff or vendors, and track parts and cost to close-out.",
    badge: "bg-gradient-to-br from-amber-400 to-orange-600",
    href: "/dashboard/maintenance/work-orders",
  },
  {
    icon: ShieldCheck,
    title: "Visitor & gate management",
    description: "OTP/QR gate passes, guard shift scheduling, patrol logs, and an incident register at the front desk.",
    badge: "bg-gradient-to-br from-violet-400 to-purple-600",
    href: "/dashboard/gate",
  },
  {
    icon: FileCheck2,
    title: "Compliance & documents",
    description: "Lease documents, expiry alerts, and jurisdiction checklists aligned with Lagos Tenancy Law and NDPR.",
    badge: "bg-gradient-to-br from-rose-400 to-pink-600",
    href: "/dashboard/compliance/certificates",
  },
  {
    icon: BarChart3,
    title: "Reporting & analytics",
    description: "Occupancy, revenue, arrears, and maintenance-cost reports at the portfolio or single-property level.",
    badge: "bg-gradient-to-br from-cyan-400 to-teal-600",
    href: "/dashboard/reports",
  },
];

export default async function LandingPage() {
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <span className="font-heading text-lg font-semibold">Rose Garden Estate</span>
        <Button render={<Link href="/login" />} variant="outline" size="sm">
          Staff sign in
        </Button>
      </header>

      <section className="flex flex-col items-center gap-6 px-6 py-16 text-center">
        <h1 className="max-w-2xl font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
          Rose Garden Estate Management System
        </h1>
        <p className="max-w-xl text-balance text-muted-foreground">
          A single system for managing Rose Garden Estate — leases and rent, maintenance, gate access, and
          resident communication — built for the way estates in Nigeria actually run.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button render={<a href="#request-access" />}>Request access</Button>
          <Button render={<Link href="/login" />} variant="outline">
            Staff sign in
          </Button>
        </div>
        <HeroIllustration />
      </section>

      <section className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-4 px-6 pb-20 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <Link
            key={feature.title}
            href={`/login?next=${encodeURIComponent(feature.href)}`}
            className="group"
          >
            <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:shadow-md group-hover:ring-primary/30">
              <CardHeader>
                <div className={`mb-2 flex size-11 items-center justify-center rounded-xl ${feature.badge}`}>
                  <feature.icon className="size-5 text-white" />
                </div>
                <CardTitle className="flex items-center justify-between">
                  {feature.title}
                  <ArrowRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </section>

      <section id="request-access" className="flex flex-col items-center bg-muted/40 px-6 py-20">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-xl">Request access</CardTitle>
            <CardDescription>
              Resident at Rose Garden Estate, or a prospective tenant? Tell us who you are and the estate office
              will follow up.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RequestAccessForm />
          </CardContent>
        </Card>
      </section>

      <footer className="border-t px-6 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Rose Garden Estate. All rights reserved.
      </footer>
    </div>
  );
}
