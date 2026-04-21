import { ReactNode, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Upload,
  LogOut,
  PackageSearch,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export function AdminLayout({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const { user, isLoading, signOut } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/");
    }
  }, [isLoading, setLocation, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex w-full bg-muted/30">
      <aside className="w-64 border-r bg-sidebar flex flex-col hidden md:flex">
        <div className="h-14 flex items-center px-4 border-b border-sidebar-border bg-sidebar">
          <div className="font-bold text-sidebar-foreground flex items-center gap-2">
            <PackageSearch className="h-5 w-5 text-accent" />
            CDD Maceió Admin
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-3 px-3 py-2 text-sm rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
          <Link
            href="/admin/upload"
            className="flex items-center gap-3 px-3 py-2 text-sm rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <Upload className="h-4 w-4" />
            Upload Base
          </Link>
          <Link
            href="/estoque"
            className="flex items-center gap-3 px-3 py-2 text-sm rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <PackageSearch className="h-4 w-4" />
            Consulta Pública
          </Link>
        </nav>
        <div className="p-4 border-t border-sidebar-border">
          <div className="text-xs text-sidebar-foreground/60 mb-2 px-1 truncate">
            {user.email}
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
            onClick={() => {
              void signOut().then(() => {
                setLocation("/");
              });
            }}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b bg-background flex items-center justify-between px-4 md:px-6">
          <div className="md:hidden font-bold flex items-center gap-2">
            <PackageSearch className="h-5 w-5 text-primary" />
            CDD Maceió
          </div>
          <div className="ml-auto flex items-center gap-4">
            <span className="text-sm font-medium">{user.displayName}</span>
          </div>
        </header>
        <div className="flex-1 p-4 md:p-6 overflow-auto">{children}</div>
      </main>
    </div>
  );
}
