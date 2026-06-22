import { doc, updateDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const XP_ACOES = {
  POST: 10,
  COMENTARIO: 5,
  REACAO: 2,
  MENSAGEM: 1,
  ANUNCIO: 15,
  AMIGO: 10,
  GRUPO: 20,
  ENQUETE_VOTO: 3,
};

export const NIVEIS = [
  { nivel: 1, nome: "novato",   xpMin: 0,    emoji: "🌱", cor: "#9ca3af" },
  { nivel: 2, nome: "membro",   xpMin: 50,   emoji: "⭐", cor: "#3b82f6" },
  { nivel: 3, nome: "ativo",    xpMin: 150,  emoji: "🔥", cor: "#f59e0b" },
  { nivel: 4, nome: "popular",  xpMin: 400,  emoji: "💎", cor: "#8b5cf6" },
  { nivel: 5, nome: "veterano", xpMin: 800,  emoji: "👑", cor: "#ef4444" },
  { nivel: 6, nome: "lenda",    xpMin: 1500, emoji: "🏆", cor: "#f26522" },
];

export function getNivel(xp) {
  for (let i = NIVEIS.length - 1; i >= 0; i--) {
    if (xp >= NIVEIS[i].xpMin) return NIVEIS[i];
  }
  return NIVEIS[0];
}

export function getProximoNivel(xp) {
  const atual = getNivel(xp);
  return NIVEIS.find((n) => n.nivel === atual.nivel + 1) || null;
}

export async function adicionarXp(uid, quantidade) {
  try {
    await updateDoc(doc(db, "usuarios", uid), { xp: increment(quantidade) });
  } catch (e) {
    console.error("xp:", e);
  }
}
