/**
 * Banc d'essai du chat multi-tours. Fait de vrais appels à /api/chat et
 * maintient l'état comme le client (numéros de citation, passages cités).
 *
 *   node scripts/test-chat.mjs                    # contre netlify dev
 *   BASE=https://votre-site.netlify.app node scripts/test-chat.mjs
 *   node scripts/test-chat.mjs 3                  # un seul scénario
 */
import { writeFileSync } from 'node:fs'
import {
  BASE,
  CITE,
  citesDe,
  demander as ask,
  gras,
  gris,
  rouge,
  vert,
} from './lib/client-chat.mjs'
import { scenarios } from './scenarios.mjs'

function afficher(question, r) {
  console.log(`\n  ${gras('▸ ' + question)}`)
  console.log(
    gris(
      `    plan : ${r.plan.length === 0 ? 'aucune recherche' : r.plan.map((q) => `« ${q.q} »${q.doc ? ' [doc ciblé]' : ''}`).join('  +  ')}`,
    ),
  )
  const reponse = r.messages.at(-1).content
  const cites = citesDe(reponse)
  const resume = r.sources
    .slice(0, 6)
    .map((s) => `${s.n}·${(s.authors ?? s.title).split(' ')[0]}${s.recalled ? '↩' : ''}`)
    .join(' ')
  const docs = new Set(r.sources.map((s) => s.documentId))
  const parDoc = {}
  for (const s of r.sources) parDoc[s.documentId] = (parDoc[s.documentId] ?? 0) + 1
  const concentration = Math.max(0, ...Object.values(parDoc))
  const docsCites = new Set(r.sources.filter((s) => cites.has(s.n)).map((s) => s.documentId))
  console.log(
    gris(
      `    sources : ${r.sources.length} sur ${docs.size} document(s), max ${concentration} d'un même · ${docsCites.size} document(s) réellement cité(s)`,
    ),
  )
  console.log(gris(`    (${resume}${r.sources.length > 6 ? '…' : ''})`))
  console.log(gris('    ') + reponse.replace(/\n+/g, ' ').slice(0, 240) + '…')
  if (r.erreur) console.log(rouge(`    ERREUR : ${r.erreur}`))
  return { cites, reponse, docs, concentration, docsCites }
}

const RECOLTE = []

async function conversation(titre, tours) {
  console.log(`\n${gras('═══ ' + titre)}`)
  let messages = []
  const traces = []
  for (const q of tours) {
    const debut = Date.now()
    const r = await ask(messages, q)
    messages = r.messages
    const mesures = afficher(q, r)
    traces.push({ ...r, ...mesures, ms: Date.now() - debut })
    RECOLTE.push({
      scenario: titre,
      question: q,
      plan: r.plan,
      reponse: messages.at(-1).content,
      articles: mesures.docs.size,
      concentration: mesures.concentration,
      articlesCites: mesures.docsCites.size,
      ms: Date.now() - debut,
    })
  }
  return traces
}

function bilan() {
  const avecSources = RECOLTE.filter((t) => t.concentration > 0)
  const moy = (f) => (avecSources.reduce((s, t) => s + f(t), 0) / avecSources.length).toFixed(1)
  console.log(
    `\n${gras('── Bilan')}  ${avecSources.length} tours avec recherche · ` +
      `${moy((t) => t.articles)} documents/réponse · concentration max ${moy((t) => t.concentration)} · ` +
      `${moy((t) => t.articlesCites)} documents cités · ${moy((t) => t.ms / 1000)} s/tour`,
  )
  const sortie = process.env.DUMP
  if (sortie) {
    writeFileSync(sortie, JSON.stringify(RECOLTE, null, 2))
    console.log(gris(`  transcriptions → ${sortie}`))
  }
}

const verifier = (label, ok) => console.log(`  ${ok ? vert('✓') : rouge('✗')} ${label}`)

const docs = await (await fetch(`${BASE}/api/documents`)).json().then((d) => d.documents)
console.log(gris(`${docs.length} documents dans le corpus · ${BASE}`))
const cible = docs.find((d) => d.authors && d.year) ?? docs[0]
const SC = scenarios(cible)
const seul = process.argv[2] ? Number(process.argv[2]) : null
const lancer = (n) => !seul || seul === n

if (lancer(1)) {
  const s = SC[0]
  const t = await conversation(s.titre, s.tours)
  verifier('le plan du 3e tour est autoportant', t[2].plan[0]?.q.length > 25)
  verifier('le 3e tour cherche dans le corpus', t[2].sources.length > 0)
  // Le vrai défaut serait « de quoi parlez-vous ? » : le sujet doit avoir survécu.
  verifier('le 3e tour a gardé le sujet', s.motDuSujet.test(t[2].reponse))
}

if (lancer(2)) {
  const s = SC[1]
  const t = await conversation(s.titre, s.tours)
  const reportes = t[1].sources.filter((x) => x.recalled).length
  verifier(`les passages du sujet précédent s'évincent (${reportes} reportés)`, reportes <= 2)
}

if (lancer(3)) {
  const s = SC[2]
  const t = await conversation(s.titre, s.tours)
  verifier('le plan contient 2 requêtes', t[1].plan.length >= 2)
  verifier('un document est explicitement ciblé', t[1].plan.some((q) => q.doc))
  verifier('les sources couvrent au moins 2 documents', t[1].docs.size >= 2)
}

if (lancer(4)) {
  const s = SC[3]
  const t = await conversation(s.titre, s.tours)
  verifier('aucune erreur sur les 6 tours', t.every((x) => !x.erreur))
  verifier('la 1re question déclenche bien une recherche', t[0].plan.length > 0)
  verifier('« combien de documents » ne déclenche pas de recherche', t[1].plan.length === 0)
  verifier('le tour de politesse ne déclenche pas de recherche', t[5].plan.length === 0)
}

// Un gabarit de la consigne recopié au lieu d'être instancié : la fuite est
// invisible à l'œil quand l'exemple est dans le domaine du corpus.
const gabarits = RECOLTE.flatMap((t) => t.plan.map((q) => q.q)).filter((q) => /[<>]/.test(q))
console.log()
verifier(`aucun gabarit de la consigne recopié (${gabarits.join(' · ') || 'aucun'})`, gabarits.length === 0)

bilan()
console.log()
