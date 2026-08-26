import { useState } from 'react'
import type { Source } from '../lib/types'

export default function Sources({ sources, cited }: { sources: Source[]; cited: Set<number> }) {
  const [openAll, setOpenAll] = useState(false)
  const used = sources.filter((s) => cited.has(s.n))
  const shown = openAll ? sources : used.length > 0 ? used : sources.slice(0, 3)

  return (
    <div className="mt-5 border-t border-line pt-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="text-[0.66rem] font-semibold tracking-[0.11em] text-muted uppercase">
          Sources {used.length > 0 && `· ${used.length} citée${used.length > 1 ? 's' : ''}`}
        </h4>
        {sources.length > shown.length || openAll ? (
          <button
            onClick={() => setOpenAll(!openAll)}
            className="text-[0.7rem] font-medium text-accent hover:text-accent-ink"
          >
            {openAll ? 'Réduire' : `Voir les ${sources.length} passages retrouvés`}
          </button>
        ) : null}
      </div>

      <ol className="mt-2.5 flex flex-col gap-1.5">
        {shown.map((s) => (
          <li
            key={s.n}
            id={`src-${s.n}`}
            className="group flex gap-2.5 rounded-lg px-2 py-1.5 transition target:bg-accent-soft hover:bg-paper"
          >
            <span className="mt-px shrink-0 rounded-[5px] bg-paper px-1.5 py-0.5 font-mono text-[0.66rem] font-medium text-ink-soft">
              {s.n}
            </span>
            <div className="min-w-0">
              <p className="text-[0.78rem] leading-snug font-medium text-ink">
                {s.authors ?? s.title}
                {s.year && <span className="font-normal text-muted"> · {s.year}</span>}
                {s.journal && <span className="font-normal text-muted"> · {s.journal}</span>}
                {s.page && <span className="font-mono text-muted"> · p. {s.page}</span>}
              </p>
              <p className="mt-0.5 line-clamp-2 text-[0.72rem] leading-relaxed text-muted group-hover:line-clamp-none">
                {s.excerpt}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
