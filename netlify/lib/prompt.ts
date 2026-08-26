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

export function buildSystemPrompt(passages: Passage[]): string {
  if (passages.length === 0) {
    return [
      "Tu es l'assistant d'une base documentaire scientifique, qui est actuellement vide.",
      "Réponds en français, en une phrase : aucun article n'est encore indexé, l'utilisateur peut déposer des PDF dans le panneau de gauche.",
    ].join('\n')
  }

  const corpus = passages
    .map(
      (p, i) =>
        `<extrait n="${i + 1}" source="${ref(p)}"${p.page ? ` page="${p.page}"` : ''}>\n${p.content}\n</extrait>`,
    )
    .join('\n\n')

  return `Tu es un assistant de recherche qui répond à des questions sur un corpus d'articles scientifiques. Tu t'adresses à un public professionnel (pharmacie, santé publique, vaccination).

# Extraits du corpus

${corpus}

# Règles

- Réponds **uniquement** à partir des extraits ci-dessus. Ils sont sélectionnés par recherche sémantique et peuvent être partiellement hors sujet : ignore ceux qui ne servent pas.
- Cite systématiquement tes sources avec la notation \`[1]\`, \`[2]\` placée juste après l'affirmation concernée. Plusieurs sources : \`[1][3]\`.
- Si les extraits ne permettent pas de répondre, dis-le franchement et indique ce qui manque. N'invente jamais un chiffre, un auteur ou une conclusion.
- Distingue clairement ce qui est établi de ce qui est une hypothèse ou une limite reconnue par les auteurs.
- Quand tu donnes des chiffres (prévalences, OR, IC95%, effectifs), reprends-les exactement tels qu'ils figurent dans l'extrait.
- Écris en français, en markdown : titres \`##\` si la réponse est longue, listes à puces, **gras** pour les résultats clés. Pas de préambule du type « D'après les extraits » — entre directement dans le vif.
- Sois dense et précis. Une question simple mérite une réponse courte.`
}
