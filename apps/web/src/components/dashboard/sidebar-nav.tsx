"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Receipt,
  Building2,
  DoorOpen,
  Users,
  FileSignature,
  Wrench,
  HardHat,
  UserCheck,
  ShieldCheck,
  Megaphone,
  MessageSquareWarning,
  ScrollText,
  BadgeCheck,
  ClipboardList,
  BarChart3,
  AlertTriangle,
  UserCog,
  Boxes,
  Inbox,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/properties", label: "Properties", icon: Building2, exact: false },
  { href: "/dashboard/units", label: "Units", icon: DoorOpen, exact: false },
  { href: "/dashboard/tenants", label: "Tenants", icon: Users, exact: false },
  { href: "/dashboard/leases", label: "Leases", icon: FileSignature, exact: false },
  { href: "/dashboard/financial/invoices", label: "Invoices", icon: Receipt, exact: false },
  { href: "/dashboard/maintenance/work-orders", label: "Work orders", icon: Wrench, exact: false },
  { href: "/dashboard/maintenance/inventory", label: "Inventory", icon: Boxes, exact: false },
  { href: "/dashboard/vendors", label: "Vendors", icon: HardHat, exact: false },
  { href: "/dashboard/visitors", label: "Visitors", icon: UserCheck, exact: false },
  { href: "/dashboard/gate", label: "Gate operations", icon: ShieldCheck, exact: false },
  { href: "/dashboard/access/incidents", label: "Incidents", icon: AlertTriangle, exact: false },
  { href: "/dashboard/community/announcements", label: "Announcements", icon: Megaphone, exact: false },
  { href: "/dashboard/community/complaints", label: "Complaints", icon: MessageSquareWarning, exact: false },
  { href: "/dashboard/inquiries", label: "Access requests", icon: Inbox, exact: false },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3, exact: false },
  { href: "/dashboard/compliance/audit-logs", label: "Audit log", icon: ScrollText, exact: false },
  { href: "/dashboard/compliance/certificates", label: "Certificates", icon: BadgeCheck, exact: false },
  { href: "/dashboard/compliance/checklists", label: "Checklists", icon: ClipboardList, exact: false },
  { href: "/dashboard/team", label: "Team", icon: UserCog, exact: false },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-3">
      {NAV_ITEMS.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
