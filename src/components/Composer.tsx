import { useRef, useState } from 'react'

type Props = {
  onSend: (text: string) => void
  onStop: () => void
  busy: boolean
  disabled: boolean
  placeholder: string
}

export default function Composer({ onSend, onStop, busy, disabled, placeholder }: Props) {
  const [value, setValue] = useState('')
  const area = useRef<HTMLTextAreaElement>(null)

  const grow = () => {
    const el = area.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`
  }

  const submit = () => {
    if (!value.trim() || busy || disabled) return
    onSend(value)
    setValue('')
    requestAnimationFrame(grow)
  }

  return (
    <div className="relative shrink-0 border-t border-line bg-surface/85 backdrop-blur">
      <div className="mx-auto w-full max-w-3xl px-5 py-4 lg:px-8">
        <div className="flex items-end gap-2 rounded-lg border border-line bg-surface px-3 py-2 shadow-prompt outline-2 outline-offset-2 outline-transparent transition focus-within:border-accent focus-within:outline-accent">
          <textarea
            ref={area}
            rows={1}
            value={value}
            disabled={disabled}
            placeholder={placeholder}
            onChange={(e) => {
              setValue(e.target.value)
              grow()
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submit()
              }
            }}
            className="max-h-[180px] flex-1 resize-none bg-transparent py-1.5 text-corps leading-[1.55] outline-none placeholder:text-muted disabled:cursor-not-allowed"
          />

          {busy ? (
            <button
              onClick={onStop}
              className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-line bg-surface-2 text-ink-soft transition hover:border-accent-bord hover:text-accent"
              aria-label="Arrêter"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <rect x="5" y="5" width="14" height="14" rx="2.5" />
              </svg>
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={!value.trim() || disabled}
              className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-accent text-accent-ink transition hover:bg-accent-deep disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
              aria-label="Envoyer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </button>
          )}
        </div>

        <p className="mt-2.5 text-center text-meta text-muted">
          Réponses générées à partir des seuls articles indexés · vérifiez toujours la source
          citée.
        </p>
      </div>
    </div>
  )
}
