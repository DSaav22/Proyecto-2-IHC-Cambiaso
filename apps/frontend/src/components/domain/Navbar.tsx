import { History, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "./Logo";
import { ProfileMenu } from "./ProfileMenu";


interface NavbarProps {
  name: string;
  onLogout: () => void;
  pending?: boolean;
}

export function Navbar({ name, onLogout, pending = false }: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 border-b bg-card/90 backdrop-blur-md">
      <nav
        aria-label="Principal"
        className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6"
      >
        <div className="flex items-center gap-2 sm:gap-6">
          <Link
            to="/mis-planes"
            className="rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <Logo />
          </Link>
          <Link
            to="/historial"
            className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:px-4"
          >
            <History aria-hidden="true" className="size-4" />
            <span className="sr-only sm:not-sr-only">Historial</span>
          </Link>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <ProfileMenu name={name} />
          <span aria-hidden="true" className="hidden h-6 w-px bg-border sm:block" />
          <Button
            type="button"
            variant="ghost"
            onClick={onLogout}
            disabled={pending}
            className="px-3 text-muted-foreground hover:bg-muted hover:text-foreground sm:px-4"
          >
            <LogOut aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">{pending ? "Cerrando…" : "Cerrar sesión"}</span>
          </Button>
        </div>
      </nav>
    </header>
  );
}
