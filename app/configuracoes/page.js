"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { desbloquear } from "@/lib/social";
import AppShell from "@/components/AppShell";
import { Settings, Lock, ShieldOff, Info } from "lucide-react";

export default function ConfigPage() {
  return <AppShell><Configuracoes /></AppShell>;
}

function Configuracoes() {
  const { user } = useAuth();
  const [senhaAtual, setSenhaAtual] = useState("");
  const [senhaNova, setSenhaNova] = useState("");
  const [senhaConfirma, setSenhaConfirma] = useState("");
  const [senhaMsg, setSenhaMsg] = useState("");
  const [trocando, setTrocando] = useState(false);
  const [bloqueados, setBloqueados] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!user) return;
    getDocs(collection(db, "usuarios", user.uid, "bloqueados")).then((snap) => {
      setBloqueados(snap.docs.map((d) => ({ uid: d.id, ...d.data() })));
      setCarregando(false);
    });
  }, [user]);

  async function trocarSenha() {
    if (!senhaNova || senhaNova.length < 6) {
      setSenhaMsg("a nova senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (senhaNova !== senhaConfirma) {
      setSenhaMsg("as senhas não coincidem.");
      return;
    }
    setTrocando(true);
    setSenhaMsg("");
    try {
      const credential = EmailAuthProvider.credential(user.email, senhaAtual);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, senhaNova);
      setSenhaMsg("senha alterada com sucesso!");
      setSenhaAtual("");
      setSenhaNova("");
      setSenhaConfirma("");
    } catch (e) {
      console.error(e);
      if (e.code === "auth/wrong-password" || e.code === "auth/invalid-credential") {
        setSenhaMsg("senha atual incorreta.");
      } else {
        setSenhaMsg("não consegui trocar a senha. tente novamente.");
      }
    } finally {
      setTrocando(false);
    }
  }

  async function desbloq(uid) {
    try {
      await desbloquear(user.uid, uid);
      setBloqueados((prev) => prev.filter((b) => b.uid !== uid));
    } catch (e) {
      console.error(e);
      alert("não consegui desbloquear.");
    }
  }

  return (
    <>
      <p className="card-titulo" style={{ padding: "0 4px", display: "flex", alignItems: "center", gap: 6 }}>
        <Settings size={16} /> configurações
      </p>

      <section className="card">
        <p className="card-titulo" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Lock size={14} /> trocar senha
        </p>
        <div className="campo">
          <label>senha atual</label>
          <input type="password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)}
            placeholder="sua senha atual" />
        </div>
        <div className="campo">
          <label>nova senha</label>
          <input type="password" value={senhaNova} onChange={(e) => setSenhaNova(e.target.value)}
            placeholder="mínimo 6 caracteres" />
        </div>
        <div className="campo">
          <label>confirmar nova senha</label>
          <input type="password" value={senhaConfirma} onChange={(e) => setSenhaConfirma(e.target.value)}
            placeholder="repita a nova senha" />
        </div>
        <button className="btn-primario" onClick={trocarSenha} disabled={trocando}>
          {trocando ? "trocando..." : "trocar senha"}
        </button>
        {senhaMsg && (
          <p className={senhaMsg.includes("sucesso") ? "salvo" : "erro"} style={{ marginTop: 10 }}>
            {senhaMsg}
          </p>
        )}
      </section>

      <section className="card">
        <p className="card-titulo" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <ShieldOff size={14} /> usuários bloqueados
        </p>
        {carregando && <p className="vazio">carregando...</p>}
        {!carregando && bloqueados.length === 0 && (
          <p className="vazio">nenhum usuário bloqueado.</p>
        )}
        {bloqueados.map((b) => (
          <div key={b.uid} className="config-bloqueado">
            <Link href={`/perfil/${b.uid}`} className="config-bloqueado-nome">
              {b.uid}
            </Link>
            <button className="config-desbloquear" onClick={() => desbloq(b.uid)}>
              desbloquear
            </button>
          </div>
        ))}
      </section>

      <section className="card">
        <p className="card-titulo" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Info size={14} /> sobre o app
        </p>
        <p style={{ fontSize: 14, lineHeight: 1.6 }}>
          <strong>trybut</strong> — sua tribo, do seu jeito.
        </p>
        <p style={{ fontSize: 13, color: "var(--texto-fraco)", lineHeight: 1.6, marginTop: 6 }}>
          rede social feita com carinho por riquefla.
        </p>
      </section>
    </>
  );
}
