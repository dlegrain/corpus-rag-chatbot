#!/usr/bin/env node
/**
 * La sélection de documents, vérifiée par son effet : quand l'utilisateur en
 * coche un ou plusieurs, aucune source ne vient d'ailleurs. Trois vraies
 * questions (deux documents, un seul, tout le corpus) : quelques dizaines de centimes.
 *
 *   node scripts/test-selection.mjs                        # contre netlify dev
 *   BASE=https://votre-site.netlify.app node scripts/test-selection.mjs
 */
import { BASE, demander, gras, gris, rouge, vert } from './lib/client-chat.mjs'
import { DOMAINE } from '../shared/domaine.js'

const QUESTION = process.argv[2] ?? DOMAINE.suggestions[0]

let ok = 0
let ko = 0
const check = (nom, cond, detail = '') => {
  console.log(`  ${cond ? vert('✓') : rouge('✗')} ${nom}${cond ? '' : ' — ' + detail}`)
  cond ? ok++ : ko++
}

const res = await fetch(`${BASE}/api/documents`)
if (!res.ok) throw new Error(`GET /api/documents → HTTP ${res.status}`)
const docs = ((await res.json()).documents ?? []).filter((d) => d.status === 'ready')
if (docs.length < 2) throw new Error(`il faut au moins deux documents ouverts, il y en a ${docs.length}`)
const nom = (id) => docs.find((d) => d.id === id)?.title ?? id.slice(0, 8)

async function essai(titre, docIds) {
  console.log(`\n${gras(titre)} ${gris(docIds.map(nom).join(' · ') || 'tout le corpus')}`)
  const r = await demander([], QUESTION, docIds)
  if (r.erreur) throw new Error(r.erreur)
  const venus = [...new Set(r.sources.map((s) => s.documentId))]
  console.log(gris(`  ${r.sources.length} sources, de : ${venus.map(nom).join(' · ')}`))
  check('le périmètre annoncé est celui demandé', JSON.stringify(r.perimetre ?? []) === JSON.stringify(docIds), JSON.stringify(r.perimetre))
  if (docIds.length > 0) {
    check('aucune source hors des documents cochés', venus.every((d) => docIds.includes(d)), venus.filter((d) => !docIds.includes(d)).map(nom).join(' · '))
  }
  check('la réponse cite au moins une source', /\[\d+\]/.test(r.messages.at(-1).content), 'aucune citation')
  return r
}

const [a, b] = docs
await essai('Deux documents cochés', [a.id, b.id])
await essai('Un seul document coché', [b.id])
const libre = await essai('Rien de coché', [])
check('sans sélection, la recherche reste libre (plus d’un document, ou le corpus en a un seul pertinent)', libre.sources.length > 0, 'aucune source')

console.log(`\n${ok} ✓  ${ko} ✗`)
process.exit(ko ? 1 : 0)
