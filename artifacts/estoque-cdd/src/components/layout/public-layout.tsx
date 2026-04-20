import { ReactNode } from "react";
import { Link } from "wouter";
import { PackageSearch, LogIn } from "lucide-react";

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <header className="h-14 border-b bg-background flex items-center px-4 md:px-6 shrink-0 sticky top-0 z-10">
        <div className="font-bold flex items-center gap-2 text-primary">
          <PackageSearch className="h-5 w-5 text-accent" />
          Gestão de Estoque CDD Maceió
        </div>
        <div className="ml-auto">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors font-medium">
            <LogIn className="h-4 w-4" />
            Acesso Restrito
          </Link>
        </div>
      </header>
      <main className="flex-1 overflow-auto flex flex-col">
        {children}
      </main>
    </div>
  );
}
