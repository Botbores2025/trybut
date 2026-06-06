import {
  writeBatch,
  doc,
  getDoc,
  increment,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function checarSeguindo(meuUid, alvoUid) {
  if (!meuUid || !alvoUid || meuUid === alvoUid) return false;
  const snap = await getDoc(doc(db, "usuarios", meuUid, "seguindo", alvoUid));
  return snap.exists();
}

export async function seguir(meuUid, alvoUid) {
  const batch = writeBatch(db);
  batch.set(doc(db, "usuarios", meuUid, "seguindo", alvoUid), { desde: serverTimestamp() });
  batch.set(doc(db, "usuarios", alvoUid, "seguidores", meuUid), { desde: serverTimestamp() });
  batch.update(doc(db, "usuarios", meuUid), { seguindoCount: increment(1) });
  batch.update(doc(db, "usuarios", alvoUid), { seguidoresCount: increment(1) });
  await batch.commit();
}

export async function deixarDeSeguir(meuUid, alvoUid) {
  const batch = writeBatch(db);
  batch.delete(doc(db, "usuarios", meuUid, "seguindo", alvoUid));
  batch.delete(doc(db, "usuarios", alvoUid, "seguidores", meuUid));
  batch.update(doc(db, "usuarios", meuUid), { seguindoCount: increment(-1) });
  batch.update(doc(db, "usuarios", alvoUid), { seguidoresCount: increment(-1) });
  await batch.commit();
}
