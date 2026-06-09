"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Home, MessageCircle, Users, User, Search, Bell, Moon, Sun, Settings } from "lucide-react";

export default function TopNav() {
  const path = usePathname();
  const { user } = useAuth();
  const meuPerfil = user ? `/perfil/${user.uid}` : "/perfil";
  const tab = (ativo) => "topnav-tab" + (ativo ? " ativo" : "");
  const [solCount, setSolCount] = useState(0);
  const [postNotifCount, setPostNotifCount] = useState(0);
  const [msgCount, setMsgCount] = useState(0);
  const [escuro, setEscuro] = useState(false);

  useEffect(() => {
    const salvo = localStorage.getItem("trybut-tema");
    if (salvo === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
      setEscuro(true);
    }
  }, []);

  function toggleTema() {
    const novo = !escuro;
    setEscuro(novo);
    if (novo) {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("trybut-tema", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("trybut-tema", "light");
    }
  }

  useEffect(() => {
    if (!user) return;
    const q1 = query(collection(db, "solicitacoes"), where("para", "==", user.uid));
    const unsub1 = onSnapshot(q1, (snap) => setSolCount(snap.size));
    const q2 = query(collection(db, "notificacoes"), where("paraUid", "==", user.uid));
    const unsub2 = onSnapshot(q2, (snap) => {
      let posts = 0, msgs = 0;
      snap.docs.forEach((d) => {
        const data = d.data();
        if (data.lida) return;
        if (data.tipo === "mensagem") msgs++;
        else posts++;
      });
      setPostNotifCount(posts);
      setMsgCount(msgs);
    });
    return () => { unsub1(); unsub2(); };
  }, [user]);

  const bellTotal = solCount + postNotifCount;

  return (
    <header className="topnav">
      <div className="topnav-bar">
        <Link href="/" className="logo logo-topo" style={{ textDecoration: "none" }}>trybut</Link>
        <div className="topnav-icones">
          <Link href="/configuracoes" className={"topnav-circ" + (path === "/configuracoes" ? " ativo" : "")} aria-label="configurações">
            <Settings size={19} />
          </Link>
          <button className="topnav-circ" onClick={toggleTema} aria-label="modo escuro">
            {escuro ? <Sun size={19} /> : <Moon size={19} />}
          </button>
          <Link href="/buscar" className={"topnav-circ" + (path === "/buscar" ? " ativo" : "")} aria-label="buscar">
            <Search size={19} />
          </Link>
          <Link href="/notificacoes" className={"topnav-circ" + (path === "/notificacoes" ? " ativo" : "")}
            aria-label="notificações" style={{ position: "relative" }}>
            <Bell size={19} />
            {bellTotal > 0 && <span className="notif-badge">{bellTotal > 9 ? "9+" : bellTotal}</span>}
          </Link>
        </div>
      </div>
      <nav className="topnav-tabs">
        <Link href="/" className={tab(path === "/")} aria-label="início"><Home size={24} /></Link>
        <Link href="/mensagens" className={tab(path.startsWith("/mensagens"))} aria-label="mensagens"
          style={{ position: "relative" }}>
          <MessageCircle size={24} />
          {msgCount > 0 && <span className="notif-badge tab-badge">{msgCount > 9 ? "9+" : msgCount}</span>}
        </Link>
        <Link href="/comunidades" className={tab(path.startsWith("/comunidades"))} aria-label="comunidades"><Users size={24} /></Link>
        <Link href={meuPerfil} className={tab(path.startsWith("/perfil"))} aria-label="perfil"><User size={24} /></Link>
      </nav>
    </header>
  );
}
