import type { Doc } from '../lib/types'

type Props = {
  docs: Doc[]
  loading: boolean
  scope: string | null
  onScope: (id: string | null) => void
  onRemove: (id: string) => void
}

export default function DocumentList({ docs, loading, scope, onScope, onRemove }: Props) {
  return (
    <div className="mt-4 px-3 pb-4">
      <div className="px-2 pb-2 text-etiquette font-bold tracking-[0.08em] text-accent uppercase">
        Base documentaire
      </div>

      {loading && <div className="px-2 py-3 text-meta text-muted">Chargement…</div>}
      {!loading && docs.length === 0 && (
        <div className="rounded-lg border border-line bg-surface-2 px-3 py-4 text-meta leading-normal text-ink-soft">
          Aucun article indexé. Déposez des PDF pour construire le corpus.
        </div>
      )}

      <ul className="flex flex-col gap-0.5">
        {docs.map((doc) => {
          const active = scope === doc.id
          return (
            <li key={doc.id}>
              <div
                className={`group relative rounded-lg border px-3 py-2.5 transition ${
                  active ? 'border-accent-bord bg-accent-soft' : 'border-transparent hover:bg-paper'
                }`}
              >
                <button
                  onClick={() => onScope(active ? null : doc.id)}
                  className="block w-full text-left"
                  title={active ? 'Revenir à tout le corpus' : 'Interroger uniquement cet article'}
                >
                  <div className="flex items-baseline gap-1.5">
                    <span
                      className={`truncate text-meta font-[650] ${
                        active ? 'text-accent' : 'text-ink'
                      }`}
                    >
                      {doc.authors ?? doc.title}
                    </span>
                    {doc.year && (
                      <span className="shrink-0 font-mono text-etiquette text-muted">{doc.year}</span>
                    )}
                  </div>
                  <div className="mt-0.5 truncate text-meta text-muted">
                    {doc.journal ?? doc.filename}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-etiquette text-muted">
                    <span className="font-mono">{doc.n_chunks} passages</span>
                    {doc.n_pages ? <span className="font-mono">{doc.n_pages} p.</span> : null}
                    {doc.status !== 'ready' && (
                      <span className="rounded-(--radius-pill) bg-accent-soft px-2 py-px font-[650] text-accent">
                        en cours
                      </span>
                    )}
                  </div>
                </button>

                <button
                  onClick={() => {
                    if (confirm(`Retirer « ${doc.title} » du corpus ?`)) onRemove(doc.id)
                  }}
                  className="absolute top-2 right-2 rounded-sm p-1 text-muted opacity-0 transition group-hover:opacity-100 hover:bg-rouge-soft hover:text-rouge focus:opacity-100"
                  aria-label="Retirer du corpus"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                  </svg>
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
