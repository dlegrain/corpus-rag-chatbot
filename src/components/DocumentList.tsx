import { DOMAINE } from '../../shared/domaine.js'
import type { Doc } from '../lib/types'

type Props = {
  docs: Doc[]
  loading: boolean
  /** Les documents cochés ; vide = tout le corpus. */
  scope: string[]
  onToggle: (id: string) => void
  onClear: () => void
  onRemove: (id: string) => void
}

/** La case à cocher, dessinée pour rester lisible sur la carte colorée. */
function Case({ cochee }: { cochee: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition ${
        cochee ? 'border-accent bg-accent text-white' : 'border-line bg-surface group-hover:border-accent-bord'
      }`}
    >
      {cochee && (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2">
          <path d="M5 12.5 10 17.5 19 7" />
        </svg>
      )}
    </span>
  )
}

/**
 * Chaque document se coche : la recherche ne porte alors que sur les documents
 * cochés. Rien de coché = tout le corpus. La sélection n'est pas conservée
 * d'une visite à l'autre, à dessein (voir App.tsx).
 */
export default function DocumentList({ docs, loading, scope, onToggle, onClear, onRemove }: Props) {
  return (
    <div className="mt-4 px-3 pb-4">
      <div className="flex items-baseline justify-between px-2 pb-2">
        <span className="text-etiquette font-bold tracking-[0.08em] text-accent uppercase">Base documentaire</span>
        {scope.length > 0 && (
          <button onClick={onClear} className="text-etiquette font-[650] text-muted hover:text-accent">
            Tout le corpus
          </button>
        )}
      </div>
      {!loading && docs.length > 1 && (
        <p className="px-2 pb-2 text-meta leading-normal text-muted">
          Cochez un ou plusieurs {DOMAINE.unitePluriel} pour y limiter la recherche.
        </p>
      )}

      {loading && <div className="px-2 py-3 text-meta text-muted">Chargement…</div>}
      {!loading && docs.length === 0 && (
        <div className="rounded-lg border border-line bg-surface-2 px-3 py-4 text-meta leading-normal text-ink-soft">
          Aucun {DOMAINE.unite} indexé. Déposez des PDF pour construire le corpus.
        </div>
      )}

      <ul className="flex flex-col gap-0.5">
        {docs.map((doc) => {
          const active = scope.includes(doc.id)
          // Un document encore en cours d'indexation n'est pas servi par la recherche :
          // le cocher afficherait un périmètre que le serveur n'applique pas.
          const cochable = doc.status === 'ready'
          return (
            <li key={doc.id}>
              <div
                className={`group relative rounded-lg border px-3 py-2.5 transition ${
                  active ? 'border-accent-bord bg-accent-soft' : 'border-transparent hover:bg-paper'
                }`}
              >
                <button
                  role="checkbox"
                  aria-checked={active}
                  disabled={!cochable}
                  onClick={() => onToggle(doc.id)}
                  className={`flex w-full items-start gap-2.5 text-left ${cochable ? '' : 'cursor-default'}`}
                  title={
                    !cochable
                      ? `Cet ${DOMAINE.unite} est encore en cours d’indexation`
                      : active
                        ? 'Retirer de la sélection'
                        : `Limiter la recherche à cet ${DOMAINE.unite}`
                  }
                >
                  {cochable ? <Case cochee={active} /> : <span aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-1.5">
                      <span className={`truncate text-meta font-[650] ${active ? 'text-accent' : 'text-ink'}`}>
                        {doc.authors ?? doc.title}
                      </span>
                      {doc.year && (
                        <span className="shrink-0 font-mono text-etiquette text-muted">{doc.year}</span>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-meta text-muted">
                      {doc.journal ?? doc.filename}
                    </span>
                    <span className="mt-1 flex items-center gap-2 text-etiquette text-muted">
                      <span className="font-mono">{doc.n_chunks} passages</span>
                      {doc.n_pages ? <span className="font-mono">{doc.n_pages} p.</span> : null}
                      {doc.status !== 'ready' && (
                        <span className="rounded-(--radius-pill) bg-accent-soft px-2 py-px font-[650] text-accent">
                          en cours
                        </span>
                      )}
                    </span>
                  </span>
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
