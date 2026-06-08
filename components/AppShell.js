"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
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
