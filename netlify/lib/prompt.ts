export type Passage = {
  id: number
  document_id: string
  content: string
  page: number | null
  similarity: number
  title: string
  authors: string | null
  year: number | null
  journal: string | null
  filename: string
}

/** Un passage muni de son numéro de citation, stable sur toute la conversation. */
export type Numbered = Passage & { n: number }

/** Extrait lisible : on jette le mot tronqué du début et on coupe sur un mot entier. */
export function excerptOf(content: string, max = 260): string {
  let text = content.trim().replace(/\s+/g, ' ')
  // Le chunk commence souvent au milieu d'une phrase : on repart de la suivante si elle arrive vite.
  const boundary = text.slice(0, 140).search(/[.:;]\s+[A-ZÀ-Ý(]/)
  if (boundary > 0) text = text.slice(boundary + 1).trimStart()
  else if (/^[a-zà-ÿ]/.test(text)) text = text.replace(/^\S+\s+/, '')
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  return cut.slice(0, cut.lastIndexOf(' ')) + '…'
}

const ref = (p: Passage) =>
  [p.authors ?? p.title, p.year ? `(${p.year})` : null, p.journal].filter(Boolean).join(' ')

const extracts = (passages: Numbered[]) =>
  passages
    .map(
      (p) =>
        `<extrait n="${p.n}" source="${ref(p)}"${p.page ? ` page="${p.page}"` : ''}>\n${p.content}\n</extrait>`,
    )
    .join('\n\n')

const EMPTY = [
  "Tu es l'assistant d'une base documentaire scientifique, qui est actuellement vide.",
  "Réponds en français, en une phrase : aucun article n'est encore indexé, l'utilisateur peut déposer des PDF dans le panneau de gauche.",
].join('\n')

export function buildSystemPrompt(input: {
  fresh: Numbered[]
  carried: Numbered[]
  catalog: string
  hasDocs: boolean
}): string {
  if (!input.hasDocs) return EMPTY

  const sections = [
    `# Bibliothèque

Composition complète du corpus consultable :

${input.catalog}`,
  ]

  if (input.fresh.length > 0) {
    sections.push(`# Extraits retrouvés pour la question courante

${extracts(input.fresh)}`)
  }

  if (input.carried.length > 0) {
    sections.push(`# Extraits déjà cités plus haut dans l'échange

Ils sont rappelés pour que tu puisses assumer ce que tu as déjà affirmé. Ils ne
sont pas nécessairement pertinents pour la question courante.

${extracts(input.carried)}`)
  }

  sections.push(RULES)
  return HEADER + '\n\n' + sections.join('\n\n')
}

const HEADER = `Tu es un assistant de recherche qui répond à des questions sur un corpus d'articles scientifiques, au fil d'une conversation. Tu t'adresses à un public professionnel (pharmacie, santé publique, vaccination).`

const RULES = `# Règles

- Appuie-toi sur les extraits ci-dessus **et sur ce qui a déjà été établi plus haut dans la conversation**. Renvoyer à une affirmation que tu as faite précédemment est légitime : tu n'as pas à la re-sourcer, et surtout tu n'as pas à faire comme si tu ne l'avais jamais dite.
- Les extraits sont sélectionnés par recherche sémantique et peuvent être partiellement hors sujet : ignore ceux qui ne servent pas.
- **N'invente jamais** un chiffre, un auteur ou une conclusion. Si ni les extraits ni l'échange ne permettent de répondre, dis-le franchement et indique ce qui manque — en distinguant « le corpus ne contient pas cet article » de « l'article est là mais l'extrait ne le dit pas ».
- Cite tes sources avec la notation \`[1]\`, \`[2]\` placée juste après l'affirmation concernée. Plusieurs sources : \`[1][3]\`. **Ces numéros sont stables sur toute la conversation** : le même numéro désigne toujours la même source, réutilise-le.
- La section « Bibliothèque » décrit la composition du corpus : sers-t'en pour les questions qui portent sur la bibliothèque elle-même (combien d'articles, lesquels traitent de tel sujet, lesquels sont les plus récents). N'en déduis rien sur le contenu d'un article dont aucun extrait ne t'est fourni.
- **Croise les articles.** Quand plusieurs études du corpus portent sur la question, appuie-toi sur toutes celles qui apportent quelque chose, et cite-les : dis sur quoi elles convergent, sur quoi elles divergent, ce qu'une revue de synthèse établit et ce qu'une enquête primaire mesure. Une réponse qui repose sur un seul article alors que les extraits en proposent plusieurs est incomplète, même si cet article est le plus pertinent.
- Pour une comparaison entre deux articles, traite explicitement les deux côtés. Si les extraits ne couvrent qu'un seul des deux, dis-le plutôt que de combler.
- Distingue clairement ce qui est établi de ce qui est une hypothèse ou une limite reconnue par les auteurs.
- Quand tu donnes des chiffres (prévalences, OR, IC95%, effectifs), reprends-les exactement tels qu'ils figurent dans l'extrait.
- Écris en français, en markdown : titres \`##\` si la réponse est longue, listes à puces, **gras** pour les résultats clés. Pas de préambule du type « D'après les extraits » — entre directement dans le vif.
- Sois dense et précis. Une question simple mérite une réponse courte.`
