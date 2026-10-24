import Anthropic from '@anthropic-ai/sdk'
import { createHash, timingSafeEqual } from 'node:crypto'

/**
 * Santé profonde : `/api/sante?cle=<SANTE_SECRET>` teste les vraies dépendances
 * (clés, modèles, base), là où une page qui répond 200 ne prouve rien — le 23/10,
 * l'IA de Signal est restée morte une journée entière derrière un « health » au vert.
 * Cahier des charges : ~/vigie/docs/sante-profonde.md.
 *
 * Que des points d'accès gratuits (countTokens, count_tokens, un select limité à
 * une ligne) : la sonde d'UptimeRobot passe toutes les 5 minutes sans rien coûter.
 */

/** Une vérification lève une `Echec` dont le motif est sûr à publier (jamais le corps du fournisseur). */
export class Echec extends Error {}
export type Verif = (signal: AbortSignal) => Promise<void>

const DELAI = 8_000
const CACHE = 60_000

/** Le motif publié : un code HTTP ou un libellé court, jamais un texte qui pourrait porter une clé. */
function motif(err: unknown): string {
  if (err instanceof Echec) return err.message
  const e = err as { name?: string; status?: number; statusCode?: number | string }
  if (e?.name === 'TimeoutError' || e?.name === 'AbortError' || /Timeout/.test(e?.name ?? '')) return 'délai dépassé'
  const status = e?.status ?? e?.statusCode
  if (status) return `HTTP ${status}`
  return 'appel impossible'
}

/** Rejette tout statut non 2xx avec son seul code. */
export async function attendre2xx(res: Response) {
  if (!res.ok) throw new Echec(`HTTP ${res.status}`)
}

/** Gemini countTokens : 200 = clé vivante ET modèle servi à cette clé (un GET du modèle ne le prouve pas). */
export const gemini =
  (modele: string, cle = process.env.GEMINI_API_KEY): Verif =>
  async (signal) => {
    if (!cle) throw new Echec('clé absente')
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modele}:countTokens`, {
      method: 'POST',
      headers: { 'x-goog-api-key': cle, 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: 'ok' }] }] }),
      signal,
    })
    await attendre2xx(res)
  }

/**
 * Anthropic count_tokens, avec le même client que le code (même clé, même `baseURL` :
 * le SDK lit `ANTHROPIC_BASE_URL` comme il le fait pour la rédaction).
 */
export const claude =
  (modele: string, cle = process.env.ANTHROPIC_API_KEY): Verif =>
  async (signal) => {
    if (!cle) throw new Echec('clé absente')
    const client = new Anthropic({ apiKey: cle, maxRetries: 0, timeout: DELAI })
    await client.messages.countTokens(
      { model: modele, messages: [{ role: 'user', content: 'ok' }] },
      { signal },
    )
  }

/** Un résultat Supabase (`{ error }`) devient une vérification : code d'erreur seul, pas de message. */
export function sansErreur(r: { error: { code?: string; status?: number; statusCode?: string | number } | null }) {
  const e = r.error
  if (!e) return
  const code = e.status ?? e.statusCode ?? e.code
  throw new Echec(code ? `code ${String(code).replace(/[^\w.-]/g, '').slice(0, 20)}` : 'erreur base')
}

async function executer(verifs: Record<string, Verif>) {
  const noms = Object.keys(verifs)
  const resultats = await Promise.all(
    noms.map(async (nom) => {
      const signal = AbortSignal.timeout(DELAI)
      // Garde-fou pour un appel qui ignorerait le signal ; `catch` vide : son rejet tardif,
      // une fois la course gagnée, ne doit pas remonter en « unhandled rejection ».
      const garde = new Promise<never>((_, rejeter) =>
        signal.addEventListener('abort', () => rejeter(signal.reason), { once: true }),
      )
      garde.catch(() => {})
      try {
        await Promise.race([verifs[nom](signal), garde])
        return 'ok'
      } catch (err) {
        console.error(`[sante] ${nom} en échec —`, err instanceof Error ? err.message : String(err))
        return `echec: ${motif(err)}`
      }
    }),
  )
  const detail = Object.fromEntries(noms.map((nom, i) => [nom, resultats[i]]))
  return { ok: resultats.every((r) => r === 'ok'), verifs: detail }
}

/** Comparaison à durée constante, sur des empreintes pour égaliser les longueurs. */
function bonneCle(fournie: string | null): boolean {
  const attendue = process.env.SANTE_SECRET
  if (!attendue || !fournie) return false
  const h = (s: string) => createHash('sha256').update(s).digest()
  return timingSafeEqual(h(fournie), h(attendue))
}

let memo: { expire: number; corps: { ok: boolean; verifs: Record<string, string> } } | null = null

const ENTETES = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
}

/** Sans le bon secret : 404, comme une route qui n'existe pas. Sinon 200 ou 503, mis en cache 60 s. */
export async function repondre(req: Request, verifs: () => Record<string, Verif>): Promise<Response> {
  if (!bonneCle(new URL(req.url).searchParams.get('cle'))) {
    return new Response('Not Found', { status: 404, headers: { 'X-Robots-Tag': ENTETES['X-Robots-Tag'] } })
  }
  if (!memo || memo.expire < Date.now()) {
    memo = { expire: Date.now() + CACHE, corps: await executer(verifs()) }
  }
  return new Response(JSON.stringify(memo.corps), { status: memo.corps.ok ? 200 : 503, headers: ENTETES })
}
