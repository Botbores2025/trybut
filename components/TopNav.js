"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Home, MessageCircle, Users, User, Search, Bell } from "lucide-react";

export default function TopNav() {
  const path = usePathname();
  const { user } = useAuth();
  const meuPerfil = user ? `/perfil/${user.uid}` : "/perfil";
  const tab = (ativo) => "topnav-tab" + (ativo ? " ativo" : "");

  return (
    <header className="topnav">
      <div className="topnav-bar">
        <Link href="/" className="logo logo-topo" style={{ textDecoration: "none" }}>
          trybut
        </Link>
        <div className="topnav-icones">
          <Link
            href="/buscar"
            className={"topnav-circ" + (path === "/buscar" ? " ativo" : "")}
            aria-label="buscar"
          >
            <Search size={19} />
          </Link>
          <span className="topnav-circ" aria-label="notificações">
            <Bell size={19} />
          </span>
        </div>
      </div>

      <nav className="topnav-tabs">
        <Link href="/" className={tab(path === "/")} aria-label="início">
          <Home size={24} />
        </Link>
        <Link href="/mensagens" className={tab(path.startsWith("/mensagens"))} aria-label="mensagens">
          <MessageCircle size={24} />
        </Link>
        <Link href="/comunidades" className={tab(path.startsWith("/comunidades"))} aria-label="comunidades">
          <Users size={24} />
        </Link>
        <Link href={meuPerfil} className={tab(path.startsWith("/perfil"))} aria-label="perfil">
          <User size={24} />
        </Link>
      </nav>
    </header>
  );
}
