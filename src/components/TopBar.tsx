import { DOMAINE } from '../../shared/domaine.js'
import type { Doc } from '../lib/types'

type Props = {
  count: number
  /** Les documents cochés ; vide = tout le corpus. */
  scopedDocs: Doc[]
  onClearScope: () => void
  onMenu: () => void
  onReset: () => void
  hasMessages: boolean
}

/**
 * Le périmètre de la recherche, toujours sous les yeux. C'est ce qui évite
 * qu'une personne cherche en vain dans un document qu'elle a décoché sans s'en
 * souvenir : un clic sur la pastille ramène à tout le corpus.
 */
export default function TopBar({ count, scopedDocs, onClearScope, onMenu, onReset, hasMessages }: Props) {
  const n = scopedDocs.length
  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-line bg-surface/80 px-4 py-3 backdrop-blur lg:px-8">
      <button onClick={onMenu} className="rounded-sm p-2 text-ink-soft hover:bg-paper lg:hidden" aria-label="Corpus">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      </button>

      <div className="min-w-0 flex-1">
        {n > 0 ? (
          <button
            onClick={onClearScope}
            title="Revenir à tout le corpus"
            className="group flex max-w-full items-center gap-2 rounded-(--radius-pill) bg-accent-soft px-3 py-1.5 text-meta font-[650] text-accent"
          >
            <span className="shrink-0 text-etiquette font-bold tracking-[0.08em] uppercase">
              {n === 1 ? `${DOMAINE.unite} seul` : `${n} ${DOMAINE.unitePluriel}`}
            </span>
            <span className="truncate text-ink">{scopedDocs.map((d) => d.authors ?? d.title).join(' · ')}</span>
            <svg
              className="shrink-0 opacity-60 group-hover:opacity-100"
              width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        ) : (
          <p className="truncate text-meta text-muted">
            Recherche sur <span className="font-[650] text-ink-soft">l’ensemble du corpus</span>
            {count > 0 && (
              <span className="font-mono">
                {' '}
                · {count} {count > 1 ? DOMAINE.unitePluriel : DOMAINE.unite}
              </span>
            )}
          </p>
        )}
      </div>

      <a
        href="https://ai-shift.be"
        target="_blank"
        rel="noreferrer"
        className="hidden items-center gap-2 text-meta text-muted transition hover:text-ink sm:flex"
      >
        Conçu par
        <img src="/ai-shift.png" alt="AI Shift" className="h-[26px] w-auto rounded-xs bg-surface px-1 py-0.5" />
      </a>

      {hasMessages && (
        <button
          onClick={onReset}
          className="rounded-sm border border-line bg-surface px-3 py-1.5 text-meta font-[650] text-ink-soft transition hover:border-accent-bord hover:text-accent"
        >
          Nouvelle question
        </button>
      )}
    </header>
  )
}
