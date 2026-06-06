"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Home, MessageCircle, Users, User, Search, Bell } from "lucide-react";

export default function TopNav() {
  const path = usePathname();
  const { user } = useAuth();
  const meuPerfil = user ? `/perfil/${user.uid}` : "/perfil";
  const tab = (ativo) => "topnav-tab" + (ativo ? " ativo" : "");
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "solicitacoes"),
      where("para", "==", user.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      setNotifCount(snap.size);
    });
    return () => unsub();
  }, [user]);

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
          <Link
            href="/notificacoes"
            className={"topnav-circ" + (path === "/notificacoes" ? " ativo" : "")}
            aria-label="notificações"
            style={{ position: "relative" }}
          >
            <Bell size={19} />
            {notifCount > 0 && <span className="notif-badge">{notifCount}</span>}
          </Link>
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
