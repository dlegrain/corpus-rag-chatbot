/**
 * Preuve hors ligne que Sentry reçoit l'erreur AVANT que la function ait fini
 * (réponse rendue ou flux fermé) — le piège du gel Netlify, vu sur Signal le 23/10.
 *
 *   npx tsx scripts/test-sentry.mts
 *
 * Tout est faux et local : un faux Sentry (le DSN pointe dessus), une fausse base
 * Supabase, un faux Anthropic, et Gemini intercepté. Aucun appel payant, aucune
 * écriture dans une vraie base. Vérifie aussi qu'aucun contenu (question, texte
 * ou nom d'un ouvrage) ne part dans les événements.
 */
import { createServer, type IncomingMessage } from 'node:http'
import { gunzipSync } from 'node:zlib'
import type { AddressInfo } from 'node:net'

type Recu = { t: number; texte: string }
const recus: Recu[] = []

const corps = (req: IncomingMessage) =>
  new Promise<Buffer>((ok) => {
    const parts: Buffer[] = []
    req.on('data', (c) => parts.push(c))
    req.on('end', () => ok(Buffer.concat(parts)))
  })

// Le faux Sentry : il répond lentement, pour qu'un envoi non attendu se voie.
const sentry = createServer(async (req, res) => {
  const brut = await corps(req)
  const texte = req.headers['content-encoding'] === 'gzip' ? gunzipSync(brut).toString() : brut.toString()
  await new Promise((r) => setTimeout(r, 150))
  recus.push({ t: Date.now(), texte })
  res.writeHead(200, { 'content-type': 'application/json' }).end('{}')
})

// Fausse base (PostgREST) et faux Anthropic sur le même port.
let panneBase = false
const amont = createServer(async (req, res) => {
  await corps(req)
  const url = req.url ?? ''
  if (url.startsWith('/anthropic/')) {
    res.writeHead(401, { 'content-type': 'application/json' })
    return res.end(JSON.stringify({ type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } }))
  }
  if (panneBase || req.method !== 'GET') {
    res.writeHead(500, { 'content-type': 'application/json' })
    return res.end(JSON.stringify({ code: 'XX000', message: 'base indisponible (essai)', details: null, hint: null }))
  }
  res.writeHead(200, { 'content-type': 'application/json' }).end('[]')
})

const ecoute = (s: ReturnType<typeof createServer>) =>
  new Promise<number>((ok) => s.listen(0, '127.0.0.1', () => ok((s.address() as AddressInfo).port)))
const [portSentry, portAmont] = await Promise.all([ecoute(sentry), ecoute(amont)])

Object.assign(process.env, {
  SENTRY_DSN: `http://clepublique@127.0.0.1:${portSentry}/1`,
  NETLIFY_DEV: 'true',
  ACCES_LOCAL: 'ouvert',
  ACCES: '',
  CORPUS_ORGANIZATION_ID: '00000000-0000-0000-0000-000000000000',
  SUPABASE_URL: `http://127.0.0.1:${portAmont}`,
  SUPABASE_SERVICE_ROLE_KEY: 'fausse-cle',
  ANTHROPIC_API_KEY: 'fausse-cle',
  ANTHROPIC_BASE_URL: `http://127.0.0.1:${portAmont}/anthropic`,
  GEMINI_API_KEY: 'fausse-cle',
})

// Gemini est appelé par son adresse publique : intercepté, il répond comme à une clé morte.
const vraiFetch = globalThis.fetch
globalThis.fetch = (async (entree: RequestInfo | URL, init?: RequestInit) => {
  const url = String(entree instanceof Request ? entree.url : entree)
  if (url.includes('generativelanguage.googleapis.com')) {
    return new Response(JSON.stringify({ error: { code: 400, message: 'API key not valid. Please pass a valid API key.' } }), { status: 400 })
  }
  return vraiFetch(entree, init)
}) as typeof fetch

const SECRETS = ['QUESTION_SECRETE_7Q', 'TEXTE_OUVRAGE_SECRET', 'LIVRE_SECRET_9Z', 'fausse-cle']
const ctx = {} as never
let echecs = 0
const verifier = (nom: string, ok: boolean, detail = '') => {
  console.log(`${ok ? '✓' : '✗'} ${nom}${detail ? ` — ${detail}` : ''}`)
  if (!ok) echecs++
}

/** Lance une function, attend sa fin réelle (flux lu jusqu'au bout), et regarde ce que Sentry a reçu avant. */
async function essai(nom: string, appel: () => Promise<Response>, attendu: { route: string; etape?: string }) {
  const avant = recus.length
  const res = await appel()
  const contenu = await res.text() // pour un flux : rendu seulement quand le flux est fermé
  const fin = Date.now()
  const nouveaux = recus.slice(avant)
  const avantFin = nouveaux.filter((r) => r.t <= fin)
  const cible = avantFin.find((r) => r.texte.includes(`"route":"${attendu.route}"`) && (!attendu.etape || r.texte.includes(`"etape":"${attendu.etape}"`)))
  verifier(`${nom} : événement reçu avant la fin`, Boolean(cible), `${avantFin.length} reçu(s) avant, ${nouveaux.length - avantFin.length} après ; HTTP ${res.status}`)
  verifier(`${nom} : étiqueté origine=test`, Boolean(cible?.texte.includes('"origine":"test"')))
  const fuite = SECRETS.filter((s) => nouveaux.some((r) => r.texte.includes(s)))
  verifier(`${nom} : aucun contenu ni clé dans l'événement`, fuite.length === 0, fuite.join(', '))
  return contenu
}

const chat = (await import('../netlify/functions/chat.mjs')).default
const ingest = (await import('../netlify/functions/ingest.mjs')).default
const documents = (await import('../netlify/functions/documents.mjs')).default
const json = (url: string, body: unknown) => new Request(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

// 1. Flux SSE : la recherche (Gemini, clé morte) échoue DANS le flux, après la réponse rendue.
const flux = await essai(
  'chat (flux)',
  () => chat(json('http://local/api/chat', { messages: [{ role: 'user', content: 'QUESTION_SECRETE_7Q sur la TVA ?' }] }), ctx),
  { route: 'chat' },
)
verifier('chat (flux) : la personne reçoit un message d’erreur', flux.includes('"type":"error"'))

// 2. Import : l'extraction des métadonnées (Gemini) échoue et se replie — ce repli était muet.
await essai(
  'ingest (métadonnées)',
  () => ingest(json('http://local/api/ingest', { op: 'start', docId: crypto.randomUUID(), filename: 'LIVRE_SECRET_9Z.pdf', sample: 'TEXTE_OUVRAGE_SECRET '.repeat(20) }), ctx),
  { route: 'ingest', etape: 'metadonnees' },
)

// 3. Réponse JSON : la base tombe sur la liste des ouvrages.
panneBase = true
await essai('documents (base en panne)', () => documents(new Request('http://local/api/documents'), ctx), { route: 'documents', etape: 'liste' })
panneBase = false

// 4. Exception qui s'échappe (corps illisible) : 500 propre ET issue, au lieu d'un 500 muet.
await essai(
  'chat (exception non rattrapée)',
  () => chat(new Request('http://local/api/chat', { method: 'POST', body: '{pas du json' }), ctx),
  { route: 'chat', etape: 'non rattrapée' },
)

sentry.close()
amont.close()
console.log(echecs ? `\n${echecs} échec(s)` : '\nTout est envoyé avant la fin de la function.')
process.exit(echecs ? 1 : 0)
