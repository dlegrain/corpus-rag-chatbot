/**
 * Juge les réponses de deux passages du banc d'essai, à l'aveugle et par paires.
 *
 *   node scripts/juge.mjs avant.json apres.json
 *
 * Les deux réponses d'une même question sont présentées en A/B dans un ordre
 * tiré au sort, pour que la position ne biaise pas le verdict. Le juge ne sait
 * pas laquelle vient de quelle version.
 */
import { readFileSync } from 'node:fs'
import Anthropic from '@anthropic-ai/sdk'

const [f1, f2] = process.argv.slice(2)
if (!f1 || !f2) throw new Error('usage: node scripts/juge.mjs <avant.json> <apres.json>')

const lire = (f) => JSON.parse(readFileSync(f, 'utf8'))
const [a, b] = [lire(f1), lire(f2)]
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SCHEMA = {
  type: 'object',
  properties: {
    gagnant: { type: 'string', enum: ['A', 'B', 'egalite'] },
    critere_decisif: { type: 'string', description: 'Quelques mots' },
    justification: { type: 'string', description: 'Deux phrases maximum' },
  },
  required: ['gagnant', 'critere_decisif', 'justification'],
  additionalProperties: false,
}

const CONSIGNE = `Tu évalues deux réponses d'un assistant documentaire adossé à un corpus de 12 articles scientifiques sur la vaccination en pharmacie d'officine. Les deux répondent à la même question, dans le même contexte de conversation.

Juge selon ces critères, par ordre d'importance :

1. **Ancrage réel** — la réponse s'appuie-t-elle sur plusieurs sources distinctes quand la question s'y prête, ou tourne-t-elle autour d'un seul article ?
2. **Elle répond** — une dérobade (« les extraits ne permettent pas de… ») est légitime si le corpus ne couvre vraiment pas le sujet, mais c'est un défaut grave si elle masque une recherche qui a mal ramené.
3. **Précision** — chiffres, nuances, distinction entre résultat établi et limite reconnue.
4. **Densité** — pas de délayage, pas de préambule.

Ne te laisse pas influencer par la longueur : une réponse plus longue n'est pas meilleure. Ignore l'ordre de présentation.`

let scores = { A: 0, B: 0, egalite: 0 }
const details = []

for (const [i, tourA] of a.entries()) {
  const tourB = b[i]
  if (!tourB || tourA.question !== tourB.question) continue
  if (!tourA.reponse || !tourB.reponse) continue

  const permute = Math.random() < 0.5
  const [gauche, droite] = permute ? [tourB, tourA] : [tourA, tourB]

  const res = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 4000,
    system: CONSIGNE,
    messages: [
      {
        role: 'user',
        content: `## Question\n${tourA.question}\n\n## Réponse A\n${gauche.reponse}\n\n## Réponse B\n${droite.reponse}`,
      },
    ],
    output_config: { format: { type: 'json_schema', schema: SCHEMA } },
  })

  if (res.stop_reason === 'max_tokens') {
    console.log(`\x1b[31m! verdict tronqué, ignoré : ${tourA.question}\x1b[0m`)
    continue
  }
  const texte = res.content.find((c) => c.type === 'text')
  const verdict = JSON.parse(texte.text)
  // On retraduit vers les versions réelles : A = fichier 1, B = fichier 2.
  const reel =
    verdict.gagnant === 'egalite' ? 'egalite' : permute ? (verdict.gagnant === 'A' ? 'B' : 'A') : verdict.gagnant
  scores[reel]++
  details.push({ question: tourA.question, gagnant: reel, ...verdict })
}

const nom = { A: f1, B: f2, egalite: 'égalité' }
console.log(`\n\x1b[1mVerdict sur ${details.length} paires\x1b[0m`)
console.log(`  ${f1} : ${scores.A}`)
console.log(`  ${f2} : ${scores.B}`)
console.log(`  égalités : ${scores.egalite}\n`)
for (const d of details) {
  const marque = d.gagnant === 'B' ? '\x1b[32m▲\x1b[0m' : d.gagnant === 'A' ? '\x1b[31m▼\x1b[0m' : '\x1b[90m=\x1b[0m'
  console.log(`${marque} ${d.question}`)
  console.log(`\x1b[90m   ${d.critere_decisif} — ${d.justification.slice(0, 200)}\x1b[0m`)
}
