// id determinístico da conversa entre dois usuários
// (mesma conversa não importa quem abre primeiro)
export function idConversa(a, b) {
  return [a, b].sort().join("_");
}
