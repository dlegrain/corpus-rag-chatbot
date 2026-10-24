import { claude, gemini, sansErreur, type Verif } from './sante.js'
import { db, T } from './supabase.js'
import { MODEL as EMBED } from './embed.js'
import { MODEL as META } from './metadata.js'
import { MODEL as PLAN } from './plan.js'
import { MODELE_CHAT } from './modele-chat.js'

/** Les dépendances réelles de ce corpus, avec les mêmes constantes que le code qui s'en sert. */
export function verifsDuSite(): Record<string, Verif> {
  return {
    [`gemini:${EMBED}`]: gemini(EMBED),
    [`gemini:${META}`]: gemini(META),
    [`claude:${MODELE_CHAT}`]: claude(MODELE_CHAT),
    // Planificateur et rédaction peuvent partager le même modèle : une seule entrée alors.
    [`claude:${PLAN}`]: claude(PLAN),
    base: async (signal) => sansErreur(await db().from(T.documents).select('id').limit(1).abortSignal(signal)),
    stockage: async () => sansErreur(await db().storage.from(T.bucket).list('', { limit: 1 })),
  }
}
