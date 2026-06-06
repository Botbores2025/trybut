import {
  writeBatch,
  doc,
  getDoc,
  deleteDoc,
  setDoc,
  increment,
  serverTimestamp,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// Checar relação: "eu" | "bloqueado" | "amigos" | "enviada" | "recebida" | "nenhuma"
export async function checarRelacao(meuUid, alvoUid) {
  if (!meuUid || !alvoUid || meuUid === alvoUid) return "eu";

  const bloqSnap = await getDoc(doc(db, "usuarios", meuUid, "bloqueados", alvoUid));
  if (bloqSnap.exists()) return "bloqueado";

  const amigoSnap = await getDoc(doc(db, "usuarios", meuUid, "amigos", alvoUid));
  if (amigoSnap.exists()) return "amigos";

  const id = [meuUid, alvoUid].sort().join("_");
  const solSnap = await getDoc(doc(db, "solicitacoes", id));
  if (solSnap.exists()) {
    return solSnap.data().de === meuUid ? "enviada" : "recebida";
  }

  return "nenhuma";
}

// Enviar solicitação de amizade
export async function enviarSolicitacao(meuUid, meuNome, minhaFoto, alvoUid, alvoNome, alvoFoto) {
  // Checar se o alvo me bloqueou
  const bloqSnap = await getDoc(doc(db, "usuarios", alvoUid, "bloqueados", meuUid));
  if (bloqSnap.exists()) {
    throw new Error("não foi possível enviar a solicitação.");
  }
  const id = [meuUid, alvoUid].sort().join("_");
  await setDoc(doc(db, "solicitacoes", id), {
    de: meuUid,
    deNome: meuNome || "",
    deFoto: minhaFoto || "",
    para: alvoUid,
    paraNome: alvoNome || "",
    paraFoto: alvoFoto || "",
    timestamp: serverTimestamp(),
  });
}

// Aceitar solicitação → cria amizade mútua
export async function aceitarSolicitacao(meuUid, outroUid) {
  const id = [meuUid, outroUid].sort().join("_");
  const solRef = doc(db, "solicitacoes", id);
  const snap = await getDoc(solRef);
  if (!snap.exists()) return;
  const sol = snap.data();

  const outroNome = sol.de === outroUid ? sol.deNome : sol.paraNome;
  const outroFoto = sol.de === outroUid ? sol.deFoto : sol.paraFoto;
  const meuNome = sol.de === meuUid ? sol.deNome : sol.paraNome;
  const minhaFoto = sol.de === meuUid ? sol.deFoto : sol.paraFoto;

  const batch = writeBatch(db);
  batch.set(doc(db, "usuarios", meuUid, "amigos", outroUid), {
    nome: outroNome, foto: outroFoto, desde: serverTimestamp(),
  });
  batch.set(doc(db, "usuarios", outroUid, "amigos", meuUid), {
    nome: meuNome, foto: minhaFoto, desde: serverTimestamp(),
  });
  batch.update(doc(db, "usuarios", meuUid), { amigosCount: increment(1) });
  batch.update(doc(db, "usuarios", outroUid), { amigosCount: increment(1) });
  batch.delete(solRef);
  await batch.commit();
}

// Recusar solicitação
export async function recusarSolicitacao(meuUid, outroUid) {
  const id = [meuUid, outroUid].sort().join("_");
  await deleteDoc(doc(db, "solicitacoes", id));
}

// Desfazer amizade
export async function desfazerAmizade(meuUid, outroUid) {
  const batch = writeBatch(db);
  batch.delete(doc(db, "usuarios", meuUid, "amigos", outroUid));
  batch.delete(doc(db, "usuarios", outroUid, "amigos", meuUid));
  batch.update(doc(db, "usuarios", meuUid), { amigosCount: increment(-1) });
  batch.update(doc(db, "usuarios", outroUid), { amigosCount: increment(-1) });
  await batch.commit();
}

// Bloquear (remove amizade + solicitação + cria bloqueio)
export async function bloquear(meuUid, outroUid) {
  const amigoSnap = await getDoc(doc(db, "usuarios", meuUid, "amigos", outroUid));
  const eramAmigos = amigoSnap.exists();

  const batch = writeBatch(db);
  batch.set(doc(db, "usuarios", meuUid, "bloqueados", outroUid), { desde: serverTimestamp() });
  batch.delete(doc(db, "usuarios", meuUid, "amigos", outroUid));
  batch.delete(doc(db, "usuarios", outroUid, "amigos", meuUid));

  const solId = [meuUid, outroUid].sort().join("_");
  batch.delete(doc(db, "solicitacoes", solId));

  if (eramAmigos) {
    batch.update(doc(db, "usuarios", meuUid), { amigosCount: increment(-1) });
    batch.update(doc(db, "usuarios", outroUid), { amigosCount: increment(-1) });
  }

  await batch.commit();
}

// Desbloquear
export async function desbloquear(meuUid, outroUid) {
  await deleteDoc(doc(db, "usuarios", meuUid, "bloqueados", outroUid));
}

// Buscar IDs dos amigos
export async function buscarAmigosUids(uid) {
  const snap = await getDocs(collection(db, "usuarios", uid, "amigos"));
  return snap.docs.map((d) => d.id);
}

// Buscar solicitações pendentes recebidas
export async function buscarSolicitacoesPendentes(meuUid) {
  const q = query(collection(db, "solicitacoes"), where("para", "==", meuUid));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
