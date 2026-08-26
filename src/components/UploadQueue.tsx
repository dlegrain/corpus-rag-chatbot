import type { UploadState } from '../lib/types'

const TONE: Record<UploadState['phase'], string> = {
  lecture: 'text-muted',
  indexation: 'text-accent-ink',
  terminé: 'text-emerald-700',
  doublon: 'text-amber-700',
  erreur: 'text-red-600',
}

export default function UploadQueue({ uploads }: { uploads: UploadState[] }) {
  if (uploads.length === 0) return null

  return (
    <div className="mt-3 flex flex-col gap-2 px-4">
      {uploads.map((u) => (
        <div key={u.filename} className="animate-rise rounded-xl bg-paper px-3 py-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-[0.75rem] font-medium text-ink">{u.filename}</span>
            <span className={`shrink-0 text-[0.66rem] font-semibold ${TONE[u.phase]}`}>
              {u.phase}
            </span>
          </div>
          {u.detail && <div className="mt-0.5 truncate text-[0.66rem] text-muted">{u.detail}</div>}
          {u.phase !== 'erreur' && (
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-500"
                style={{ width: `${u.progress}%` }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
