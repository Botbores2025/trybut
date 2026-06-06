"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import BottomNav from "@/components/BottomNav";

export default function AppShell({ children }) {
  const { user, carregando } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!carregando && !user) router.push("/login");
  }, [carregando, user, router]);

  if (carregando || !user) {
    return (
      <div className="tela-centro">
        <p className="carregando">carregando...</p>
      </div>
    );
  }

  return (
    <>
      <header className="topo">
        <Link href="/" className="logo logo-topo" style={{ textDecoration: "none" }}>
          trybut
        </Link>
      </header>
      <main className="conteudo">{children}</main>
      <BottomNav />
    </>
  );
}
