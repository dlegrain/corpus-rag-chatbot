/**
 * Preuve hors ligne du verrou d'écriture : sans le secret administrateur, ni ajout ni
 * retrait — et la base n'est même pas touchée ; avec lui, l'écriture passe.
 *
 *   npx tsx scripts/test-admin.mts
 *
 * Tout est faux et local : une fausse base Supabase (PostgREST + stockage) note chaque
 * requête reçue. Aucun appel payant, aucune écriture dans une vraie base.
 */
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'

type Recue = { methode: string; chemin: string }
const recues: Recue[] = []
const ABSENT = '00000000-0000-4000-8000-000000000000'
const PRESENT = '11111111-1111-4111-8111-111111111111'

// Fausse base : un DELETE renvoie la ligne retirée seulement pour PRESENT.
const base = createServer((req, res) => {
  req.resume()
  req.on('end', () => {
    const chemin = decodeURIComponent(req.url ?? '')
    recues.push({ methode: req.method ?? '', chemin })
    let corps = '[]'
    if (req.method === 'DELETE' && chemin.includes(`id=eq.${PRESENT}`)) corps = JSON.stringify([{ id: PRESENT }])
    if (req.method === 'PATCH') corps = JSON.stringify({ id: PRESENT, status: 'ready', n_chunks: 0 })
    res.writeHead(200, { 'content-type': 'application/json', 'content-range': '0-0/0' }).end(corps)
  })
})
const port = await new Promise<number>((ok) => base.listen(0, '127.0.0.1', () => ok((base.address() as AddressInfo).port)))

const SECRET = 'secret-essai-' + Math.random().toString(36).slice(2)
Object.assign(process.env, {
  SENTRY_DSN: '',
  SUPABASE_URL: `http://127.0.0.1:${port}`,
  SUPABASE_SERVICE_ROLE_KEY: 'fausse-cle',
  GEMINI_API_KEY: 'fausse-cle',
  CORPUS_ADMIN_SECRET: SECRET,
})

const documents = (await import('../netlify/functions/documents.mjs')).default
const ingest = (await import('../netlify/functions/ingest.mjs')).default
const admin = (await import('../netlify/functions/admin.mjs')).default
const ctx = {} as never

let echecs = 0
const verifier = (nom: string, ok: boolean, detail = '') => {
  console.log(`${ok ? '✓' : '✗'} ${nom}${detail ? ` — ${detail}` : ''}`)
  if (!ok) echecs++
}
const entetes = (secret?: string): Record<string, string> => ({
  'content-type': 'application/json',
  ...(secret === undefined ? {} : { 'x-corpus-admin': secret }),
})
const supprimer = (id: string, secret?: string) =>
  documents(new Request(`http://local/api/documents?id=${id}`, { method: 'DELETE', headers: entetes(secret) }), ctx)
const ajouter = (body: unknown, secret?: string) =>
  ingest(new Request('http://local/api/ingest', { method: 'POST', headers: entetes(secret), body: JSON.stringify(body) }), ctx)
const verifierSecret = (secret?: string) => admin(new Request('http://local/api/admin', { headers: entetes(secret) }), ctx)

/** Appelle, puis regarde le statut ET si la fausse base a été touchée. */
async function essai(nom: string, appel: () => Promise<Response>, statut: number, toucheBase: boolean) {
  const avant = recues.length
  const res = await appel()
  const touche = recues.length > avant
  verifier(`${nom} → ${statut}`, res.status === statut, `HTTP ${res.status} ${await res.text()}`)
  verifier(`${nom} : base ${toucheBase ? 'touchée' : 'intacte'}`, touche === toucheBase, `${recues.length - avant} requête(s)`)
}

console.log('— Sans secret, ou avec un faux : refus, base intacte')
await essai('DELETE sans secret', () => supprimer(PRESENT), 401, false)
await essai('DELETE secret faux', () => supprimer(PRESENT, 'mauvais'), 401, false)
await essai('DELETE secret vide', () => supprimer(PRESENT, ''), 401, false)
await essai('DELETE secret + suffixe', () => supprimer(PRESENT, SECRET + 'x'), 401, false)
await essai('ingest start sans secret', () => ajouter({ op: 'start', docId: PRESENT, filename: 'x.pdf' }), 401, false)
await essai('ingest chunks secret faux', () => ajouter({ op: 'chunks', docId: PRESENT, chunks: [{ content: 'x', page: 1, chunk_index: 0 }] }, 'mauvais'), 401, false)
await essai('ingest finish sans secret', () => ajouter({ op: 'finish', docId: PRESENT }), 401, false)
await essai('/api/admin sans secret', () => verifierSecret(), 401, false)
await essai('/api/admin secret faux', () => verifierSecret('mauvais'), 401, false)

console.log('— Avec le secret : l’écriture passe')
await essai('/api/admin bon secret', () => verifierSecret(SECRET), 200, false)
await essai('DELETE bon secret, id présent', () => supprimer(PRESENT, SECRET), 200, true)
await essai('DELETE bon secret, id absent', () => supprimer(ABSENT, SECRET), 404, true)
await essai('DELETE bon secret, id invalide', () => supprimer('pas-un-uuid', SECRET), 400, false)
await essai('ingest finish bon secret', () => ajouter({ op: 'finish', docId: PRESENT }, SECRET), 200, true)
await essai('ingest chunks vides bon secret', () => ajouter({ op: 'chunks', docId: PRESENT, chunks: [] }, SECRET), 200, false)

console.log('— Lecture : reste ouverte à tous')
await essai('GET /api/documents sans secret', () => documents(new Request('http://local/api/documents'), ctx), 200, true)

console.log('— Variable absente sur le site : personne n’écrit (verrou fermé)')
process.env.CORPUS_ADMIN_SECRET = ''
await essai('DELETE sans variable, avec « secret »', () => supprimer(PRESENT, SECRET), 401, false)
await essai('/api/admin sans variable', () => verifierSecret(''), 401, false)

base.close()
console.log(echecs ? `\n${echecs} échec(s)` : '\nVerrou d’écriture : tout est conforme.')
process.exit(echecs ? 1 : 0)
