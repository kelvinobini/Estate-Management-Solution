import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { Badge } from "@/components/ui/badge";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex flex-1">
      <aside className="hidden w-56 shrink-0 border-r bg-muted/20 md:flex md:flex-col">
        <div className="border-b px-4 py-4">
          <p className="text-sm font-semibold">Estate Management</p>
        </div>
        <SidebarNav />
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b px-4 py-3">
          <div className="md:hidden text-sm font-semibold">Estate Management</div>
          <div className="ml-auto flex items-center gap-3">
            <Badge variant="secondary">{session.role}</Badge>
            <LogoutButton />
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
