/**
 * Le secret administrateur, saisi une fois et gardé dans ce navigateur. Il part dans
 * l'en-tête `x-corpus-admin` des seules requêtes d'écriture (ajout, retrait) ; le serveur
 * le vérifie à chaque fois. Le stockage peut être absent ou refusé (navigation privée) :
 * on retombe alors sur une saisie par visite, jamais sur une erreur.
 */
const CLE = 'corpus-admin'
let enMemoire: string | null = null

export function lireSecret(): string | null {
  try {
    return localStorage.getItem(CLE) ?? enMemoire
  } catch {
    return enMemoire
  }
}

export function garderSecret(secret: string | null) {
  enMemoire = secret
  try {
    if (secret) localStorage.setItem(CLE, secret)
    else localStorage.removeItem(CLE)
  } catch {
    /* stockage indisponible : le secret vit le temps de la visite */
  }
}

/** En-têtes à joindre à une requête d'écriture. */
export function entetesAdmin(): Record<string, string> {
  const secret = lireSecret()
  return secret ? { 'x-corpus-admin': secret } : {}
}

/** Le serveur reconnaît-il ce secret ? Rien n'est écrit. */
export async function verifierSecret(secret: string): Promise<boolean> {
  try {
    const res = await fetch('/api/admin', { headers: { 'x-corpus-admin': secret } })
    return res.ok
  } catch {
    return false
  }
}
