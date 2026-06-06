"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Home, Search, Users, User, Plus } from "lucide-react";

export default function BottomNav() {
  const path = usePathname();
  const { user } = useAuth();
  const cls = (href) => "nav-item" + (path === href ? " ativo" : "");
  const meuPerfil = user ? `/perfil/${user.uid}` : "/perfil";

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
      <Link href={meuPerfil} className={"nav-item" + (path.startsWith("/perfil") ? " ativo" : "")} aria-label="perfil">
        <User size={24} />
      </Link>
    </nav>
  );
}
