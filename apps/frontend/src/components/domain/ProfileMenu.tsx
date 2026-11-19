import { Link } from "react-router-dom";
import { Avatar } from "./Avatar";

export function ProfileMenu({ name }: { name: string }) {
  return (
    <Link
      to="/mis-datos"
      className="flex min-h-11 items-center gap-2.5 rounded-lg px-1 outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50"
      aria-label={`Mis datos de ${name}`}
    >
      <Avatar decorative label={`Perfil de ${name}`} name={name} />
      <span className="hidden max-w-40 truncate text-sm font-semibold md:inline" aria-hidden="true">
        {name}
      </span>
    </Link>
  );
}
