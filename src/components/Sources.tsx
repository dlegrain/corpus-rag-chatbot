import { useState } from 'react'
import type { Source } from '../lib/types'

type Props = { sources: Source[]; cited: Set<number>; anchor: string }

export default function Sources({ sources, cited, anchor }: Props) {
  const [openAll, setOpenAll] = useState(false)
  const used = sources.filter((s) => cited.has(s.n))
  const shown = openAll ? sources : used.length > 0 ? used : sources.slice(0, 3)

  return (
    <div className="mt-5 border-t border-line pt-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="text-etiquette font-bold tracking-[0.08em] text-accent uppercase">
          Sources {used.length > 0 && `· ${used.length} citée${used.length > 1 ? 's' : ''}`}
        </h4>
        {sources.length > shown.length || openAll ? (
          <button
            onClick={() => setOpenAll(!openAll)}
            className="text-meta font-[650] text-accent hover:text-accent-deep"
          >
            {openAll ? 'Réduire' : `Voir les ${sources.length} passages retrouvés`}
          </button>
        ) : null}
      </div>

      <ol className="mt-2.5 flex flex-col gap-1.5">
        {shown.map((s) => (
          <li
            key={s.n}
            id={`${anchor}-${s.n}`}
            className="group flex gap-2.5 rounded-lg border border-transparent px-2 py-1.5 transition target:border-accent-bord target:bg-accent-soft hover:border-line hover:bg-surface"
          >
            <span className="mt-px h-fit shrink-0 rounded-xs border border-line bg-surface px-1.5 py-0.5 font-mono text-etiquette font-medium text-ink-soft">
              {s.n}
            </span>
            <div className="min-w-0">
              <p className="text-meta leading-snug font-[650] text-ink">
                {s.authors ?? s.title}
                {s.year && <span className="font-normal text-ink-soft"> · {s.year}</span>}
                {s.journal && <span className="font-normal text-ink-soft"> · {s.journal}</span>}
                {s.page && <span className="font-mono font-normal text-ink-soft"> · p. {s.page}</span>}
              </p>
              <p className="mt-0.5 line-clamp-2 text-meta leading-normal text-ink-soft group-hover:line-clamp-none">
                {s.excerpt}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
