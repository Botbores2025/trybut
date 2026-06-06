"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export default function LoginPage() {
  const router = useRouter();
  const [modo, setModo] = useState("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState("");

  const cadastro = modo === "cadastro";

  async function acao() {
    setErro("");
    if (!email || !senha) return setErro("preencha e-mail e senha.");

    try {
      if (cadastro) {
        if (!nome.trim()) return setErro("escolha um nome.");
        const cred = await createUserWithEmailAndPassword(auth, email, senha);
        await setDoc(doc(db, "usuarios", cred.user.uid), {
          nome: nome.trim(),
          cidade: "",
          bio: "",
          fotoURL: "",
          status: "online agora",
          criadoEm: serverTimestamp(),
          recadosCount: 0,
          fasCount: 0,
          comunidadesCount: 0,
        });
      } else {
        await signInWithEmailAndPassword(auth, email, senha);
      }
      router.push("/");
    } catch (e) {
      setErro(traduzErro(e.code));
    }
  }

  return (
    <div className="tela-centro">
      <div className="auth-card">
        <h1 className="logo logo-grande">trybut</h1>
        <p className="auth-sub">conecte-se com seus amigos</p>

        <div className="campo">
          <input
            type="email"
            placeholder="seu e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="campo">
          <input
            type="password"
            placeholder="sua senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
        </div>

        {cadastro && (
          <div className="campo">
            <input
              type="text"
              placeholder="como quer ser chamado?"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>
        )}

        <button className="btn-primario" onClick={acao}>
          {cadastro ? "cadastrar" : "entrar"}
        </button>

        {erro && <p className="erro">{erro}</p>}

        <p className="auth-troca">
          {cadastro ? "já tem conta?" : "ainda não tem conta?"}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setModo(cadastro ? "login" : "cadastro");
              setErro("");
            }}
          >
            {cadastro ? "entrar" : "cadastre-se"}
          </a>
        </p>
      </div>
    </div>
  );
}

function traduzErro(code) {
  const mapa = {
    "auth/invalid-email": "e-mail inválido.",
    "auth/email-already-in-use": "esse e-mail já tem conta.",
    "auth/weak-password": "a senha precisa de pelo menos 6 caracteres.",
    "auth/invalid-credential": "e-mail ou senha errados.",
    "auth/user-not-found": "não achei essa conta.",
    "auth/wrong-password": "senha errada.",
  };
  return mapa[code] || "algo deu errado. tenta de novo.";
}
