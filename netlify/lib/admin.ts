import { createHash, timingSafeEqual } from 'node:crypto'
import { json } from './supabase.js'

/**
 * Le verrou d'écriture : seul le détenteur de `CORPUS_ADMIN_SECRET` ajoute ou retire un
 * document. Lire la liste, ouvrir un PDF et poser une question restent ouverts à tous.
 *
 * Le secret voyage dans l'en-tête `x-corpus-admin` (jamais dans l'URL : elle finit dans les
 * journaux). Sans variable posée sur le site, personne n'écrit : le verrou échoue fermé.
 */
export const ENTETE_ADMIN = 'x-corpus-admin'

/** Comparaison à durée constante, sur des empreintes pour égaliser les longueurs. */
export function estAdmin(req: Request): boolean {
  const attendu = process.env.CORPUS_ADMIN_SECRET
  const fourni = req.headers.get(ENTETE_ADMIN)
  if (!attendu || !fourni) return false
  const h = (s: string) => createHash('sha256').update(s).digest()
  return timingSafeEqual(h(fourni), h(attendu))
}

/** `null` si la requête porte le bon secret, sinon la réponse 401 à rendre telle quelle. */
export function exigerAdmin(req: Request): Response | null {
  return estAdmin(req) ? null : json({ error: 'admin_required' }, 401)
}
