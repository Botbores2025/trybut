"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import TopNav from "@/components/TopNav";
import SidebarEsq from "@/components/SidebarEsq";
import SidebarDir from "@/components/SidebarDir";

export default function AppShell({ children }) {
  const { user, carregando } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!carregando && !user) router.push("/login");
  }, [carregando, user, router]);

  // heartbeat: marca online a cada 60s, offline ao sair
  useEffect(() => {
    if (!user) return;
    const ref = doc(db, "usuarios", user.uid);
    function online() {
      updateDoc(ref, { online: true, ultimoAcesso: serverTimestamp() }).catch(() => {});
    }
    function offline() {
      updateDoc(ref, { online: false, ultimoAcesso: serverTimestamp() }).catch(() => {});
    }
    online();
    const intervalo = setInterval(online, 60000);
    function onVis() { document.hidden ? offline() : online(); }
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", onVis);
      offline();
    };
  }, [user]);

  // trocar alert feio por toast bonito (global)
  useEffect(() => {
    const original = window.alert;
    window.alert = (msg) => {
      const toast = document.createElement("div");
      toast.className = "toast-msg";
      toast.textContent = msg;
      document.body.appendChild(toast);
      setTimeout(() => toast.classList.add("toast-saindo"), 2500);
      setTimeout(() => toast.remove(), 3000);
    };
    return () => { window.alert = original; };
  }, []);

  if (carregando || !user) {
    return (
      <div className="tela-centro">
        <p className="carregando">carregando...</p>
      </div>
    );
  }

  return (
    <>
      <TopNav />
      <div className="layout">
        <SidebarEsq />
        <main className="conteudo">{children}</main>
        <SidebarDir />
      </div>
    </>
  );
}
