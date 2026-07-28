import { memo, useState, type ReactNode } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { AdminSidebar } from "../components/AdminSidebar";
import { AdminSearch } from "../components/AdminSearch";
import { AdminBreadcrumb } from "../components/AdminBreadcrumb";
import { AdminQuickActions } from "../components/AdminQuickActions";
import { AdminContextPanel } from "../components/AdminContextPanel";
import { useAdminRoute } from "../hooks/useAdminRoute";

interface Props {
  children: ReactNode;
}

function AdminShellLayoutImpl({ children }: Props) {
  const active = useAdminRoute();
  const [openDrawer, setOpenDrawer] = useState(false);

  return (
    <div className="flex min-h-[calc(100vh-3rem)] w-full flex-col">
      {/* Topbar */}
      <header className="flex flex-col gap-2 border-b bg-background/80 px-4 py-3 backdrop-blur md:px-6">
        <div className="flex items-center gap-3">
          <Sheet open={openDrawer} onOpenChange={setOpenDrawer}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menu administrativo">
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetTitle className="mb-3 text-sm">Administração</SheetTitle>
              <AdminSidebar activeHref={active?.href} onNavigate={() => setOpenDrawer(false)} />
            </SheetContent>
          </Sheet>
          <AdminSearch />
          <div className="ml-auto hidden md:block">
            <AdminQuickActions />
          </div>
        </div>
        <AdminBreadcrumb active={active} />
      </header>

      {/* Corpo */}
      <div className="grid flex-1 gap-4 px-4 py-4 md:px-6 lg:grid-cols-[220px_minmax(0,1fr)_280px]">
        <aside className="hidden lg:block">
          <div className="sticky top-4">
            <AdminSidebar activeHref={active?.href} />
          </div>
        </aside>
        <main className="min-w-0">{children}</main>
        <aside className="hidden lg:block">
          <div className="sticky top-4">
            <AdminContextPanel active={active} />
          </div>
        </aside>
      </div>
    </div>
  );
}

export const AdminShellLayout = memo(AdminShellLayoutImpl);
