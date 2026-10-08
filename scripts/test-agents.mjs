/**
 * Questions « grand public » posées au corpus de démonstration (suggestions d'accueil + cas limites).
 * Sortie : JSON des réponses (pour le juge) + affichage court.
 *   BASE=http://localhost:8977 node scripts/test-agents.mjs sortie.json
 */
import { writeFileSync } from 'node:fs'
import { demander } from './lib/client-chat.mjs'
import { DOMAINE } from '../shared/domaine.js'

const QUESTIONS = [
  ...DOMAINE.suggestions,
  'Un agent IA peut-il remplacer un de mes analystes ?',
  'Si je confie ma boîte mail à un agent, un e-mail piégé peut-il le manipuler ?',
  'Quel agent IA me conseillez-vous d’acheter pour ma PME ?',
]
const out = []
for (const q of QUESTIONS) {
  const t0 = Date.now()
  const r = await demander([], q)
  const rep = r.messages.at(-1).content
  out.push({ question: q, reponse: rep, sources: r.sources?.length ?? 0, secondes: Math.round((Date.now() - t0) / 1000) })
  console.log(`\n▸ ${q}  (${out.at(-1).secondes} s, ${out.at(-1).sources} passages)\n${rep.slice(0, 700)}${rep.length > 700 ? '…' : ''}`)
}
writeFileSync(process.argv[2] ?? 'test-agents.json', JSON.stringify(out, null, 2))
