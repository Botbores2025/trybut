"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Users, User, Plus } from "lucide-react";

export default function BottomNav() {
  const path = usePathname();
  const cls = (href) => "nav-item" + (path === href ? " ativo" : "");

  return (
    <nav className="bottom-nav">
      <Link href="/" className={cls("/")} aria-label="início">
        <Home size={24} />
      </Link>
      <Link href="/buscar" className={cls("/buscar")} aria-label="buscar">
        <Search size={24} />
      </Link>
      <Link href="/" className="nav-plus" aria-label="postar">
        <Plus size={24} />
      </Link>
      <Link href="/comunidades" className={cls("/comunidades")} aria-label="comunidades">
        <Users size={24} />
      </Link>
      <Link href="/perfil" className={cls("/perfil")} aria-label="perfil">
        <User size={24} />
      </Link>
    </nav>
  );
}
