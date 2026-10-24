import * as Sentry from '@sentry/node'
import type { Context } from '@netlify/functions'

/**
 * Sentry côté functions — ce que les journaux Netlify voyaient seuls jusqu'ici.
 *
 * Le piège (prouvé sur Signal le 23/10) : une function Netlify est gelée dès sa
 * réponse rendue. `captureException` met l'événement en file et l'envoie plus
 * tard — donc jamais. Toute capture passe ici, et l'envoi est ATTENDU
 * (`vider`) avant de rendre la réponse ou de fermer le flux.
 *
 * Vie privée : ni question, ni passage, ni nom de fichier, ni adresse — rien
 * que des métadonnées (route, étape, fournisseur, modèle, statut HTTP).
 * Sans `SENTRY_DSN`, tout est inerte : vider la variable coupe Sentry.
 */

export type Contexte = {
  /** La function : `chat`, `ingest`, `documents`… */
  route: string
  /** Où dans la function : `catalogue`, `redaction`, `registre`… */
  etape?: string
  fournisseur?: 'anthropic' | 'gemini' | 'supabase' | 'studio'
  modele?: string
  statut?: number | string
  niveau?: 'error' | 'warning'
  /** Seulement pour lire l'en-tête `x-origine: test` d'un essai. */
  req?: Request
}

let pret: boolean | null = null
let enAttente = 0

function initialiser(): boolean {
  if (pret !== null) return pret
  const dsn = process.env.SENTRY_DSN
  pret = Boolean(dsn)
  if (!dsn) return false
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENV || (process.env.NETLIFY_DEV === 'true' ? 'development' : 'production'),
    tracesSampleRate: 0,
    sendDefaultPii: false,
    // Pas de fil d'Ariane : la console porte l'adresse de l'appelant, et les URL d'appels
    // sortants peuvent porter une clé. L'erreur et ses étiquettes suffisent.
    maxBreadcrumbs: 0,
    sendClientReports: false,
    // Ni lignes de source autour de la pile, ni console, ni variables locales : rien qui
    // puisse emporter un morceau de question ou de livre. La pile (fichier, ligne) suffit.
    integrations: (defauts) => defauts.filter((i) => !['ContextLines', 'Console', 'LocalVariables'].includes(i.name)),
    beforeSend(event) {
      delete event.user
      if (event.request) event.request = { method: event.request.method }
      return event
    },
  })
  return true
}

/** Le statut HTTP d'une erreur de SDK (`status`, `statusCode`) ou d'un message « Gemini embed 400: … ». */
function statutDe(err: unknown): string | undefined {
  const e = err as { status?: unknown; statusCode?: unknown; message?: unknown }
  const s = e?.status ?? e?.statusCode
  if (typeof s === 'number' || (typeof s === 'string' && s)) return String(s)
  const m = typeof e?.message === 'string' ? e.message.match(/\b([45]\d\d)\b/) : null
  return m?.[1]
}

/** Le fournisseur d'une erreur remontée sans contexte : SDK Anthropic, ou message « Gemini embed 400 ». */
function fournisseurDe(err: Error): string | undefined {
  if (/^(Anthropic|APIError|AuthenticationError|RateLimitError|NotFoundError|BadRequestError|PermissionDeniedError|InternalServerError|APIConnection)/.test(err.name)) return 'anthropic'
  if (/^Gemini\b/.test(err.message)) return 'gemini'
  return undefined
}

const estEssai = (req?: Request) =>
  req?.headers.get('x-origine') === 'test' || process.env.SENTRY_ORIGINE === 'test' || process.env.NETLIFY_DEV === 'true'

/** Une même panne vue mille fois par une instance chaude n'est envoyée qu'une fois par minute. */
const DEJA_VU = 60_000
const vus = new Map<string, number>()

/**
 * Met l'erreur en file, SANS l'envoyer. Pour le code synchrone : l'appelant (ou le
 * gabarit `avecSentry`) doit ensuite `await vider()`. Ailleurs, préférer `signaler`.
 */
export function noter(err: unknown, ctx: Contexte): void {
  if (!initialiser()) return
  // Les erreurs de supabase-js ne sont pas toujours des `Error` : on garde leur message.
  const message = (err as { message?: unknown })?.message
  const erreur = err instanceof Error ? err : new Error(typeof message === 'string' ? message : String(err))
  const statut = ctx.statut !== undefined ? String(ctx.statut) : statutDe(err)
  const cle = [ctx.route, ctx.etape, statut, erreur.message.slice(0, 120)].join('|')
  const vu = vus.get(cle)
  if (vu && Date.now() - vu < DEJA_VU) return
  vus.set(cle, Date.now())

  Sentry.withScope((scope) => {
    scope.setLevel(ctx.niveau ?? 'error')
    scope.setTag('route', ctx.route)
    if (ctx.etape) scope.setTag('etape', ctx.etape)
    const fournisseur = ctx.fournisseur ?? fournisseurDe(erreur)
    if (fournisseur) scope.setTag('fournisseur', fournisseur)
    if (ctx.modele) scope.setTag('modele', ctx.modele)
    if (statut) scope.setTag('statut', statut)
    if (estEssai(ctx.req)) scope.setTag('origine', 'test')
    Sentry.captureException(erreur)
  })
  enAttente++
}

/** Envoie ce qui est en file — à attendre avant de répondre ou de fermer un flux. */
export async function vider(): Promise<void> {
  if (!pret || enAttente === 0) return
  enAttente = 0
  await Sentry.flush(2000)
}

/** Capture ET envoi attendu. */
export async function signaler(err: unknown, ctx: Contexte): Promise<void> {
  noter(err, ctx)
  await vider()
}

type Handler = (req: Request, context: Context) => Response | Promise<Response>

/**
 * Enveloppe une function : une exception qui s'échappe devient une issue Sentry
 * (envoyée avant la réponse) et un 500 propre, au lieu d'un 500 muet de la plateforme.
 * Vide aussi ce que le code synchrone a `noter`.
 */
export function avecSentry(route: string, handler: Handler): Handler {
  return async (req, context) => {
    try {
      const res = await handler(req, context)
      await vider()
      return res
    } catch (err) {
      console.error(`[${route}] erreur non rattrapée —`, err instanceof Error ? err.message : err)
      await signaler(err, { route, etape: 'non rattrapée', req })
      return new Response(JSON.stringify({ error: 'erreur_serveur' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'X-Robots-Tag': 'noindex, nofollow, noarchive' },
      })
    }
  }
}
