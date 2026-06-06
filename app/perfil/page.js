"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function PerfilRedirect() {
  const { user, carregando } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (carregando) return;
    if (user) router.replace(`/perfil/${user.uid}`);
    else router.replace("/login");
  }, [user, carregando, router]);

  return <div className="tela-centro"><p className="carregando">carregando...</p></div>;
}
