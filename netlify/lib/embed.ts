const MODEL = 'gemini-embedding-001'
const DIMS = 768
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}`

type TaskType = 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY'

function normalize(v: number[]): number[] {
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1
  return v.map((x) => x / norm)
}

async function call(path: string, body: unknown): Promise<any> {
  const res = await fetch(`${ENDPOINT}:${path}`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': process.env.GEMINI_API_KEY as string,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Gemini embed ${res.status}: ${(await res.text()).slice(0, 300)}`)
  return res.json()
}

/** Embed a single query (asymmetric retrieval: query side). */
export async function embedQuery(text: string): Promise<number[]> {
  const json = await call('embedContent', {
    model: `models/${MODEL}`,
    content: { parts: [{ text }] },
    taskType: 'RETRIEVAL_QUERY' satisfies TaskType,
    outputDimensionality: DIMS,
  })
  return normalize(json.embedding.values)
}

/** Embed a batch of passages. Gemini accepts up to 100 requests per call. */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const out: number[][] = []
  for (let i = 0; i < texts.length; i += 50) {
    const slice = texts.slice(i, i + 50)
    const json = await call('batchEmbedContents', {
      requests: slice.map((text) => ({
        model: `models/${MODEL}`,
        content: { parts: [{ text }] },
        taskType: 'RETRIEVAL_DOCUMENT' satisfies TaskType,
        outputDimensionality: DIMS,
      })),
    })
    for (const e of json.embeddings) out.push(normalize(e.values))
  }
  return out
}
