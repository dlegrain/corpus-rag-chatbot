import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Sources from './Sources'
import type { Msg } from '../lib/types'

/** Transforme les renvois [1] en liens internes vers la source. */
const linkCitations = (text: string) => text.replace(/\[(\d{1,2})\]/g, '[$1](#src-$1)')

export default function Message({ msg, streaming }: { msg: Msg; streaming: boolean }) {
  if (msg.role === 'user') {
    return (
      <div className="animate-rise flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-[0.92rem] leading-relaxed text-white">
          {msg.content}
        </div>
      </div>
    )
  }

  const cited = new Set(
    Array.from(msg.content.matchAll(/\[(\d{1,2})\]/g)).map((m) => Number(m[1])),
  )

  return (
    <div className="animate-rise">
      {msg.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[0.85rem] text-red-700">
          {msg.error}
        </div>
      ) : (
        <>
          <div className="prose-answer">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ href, children }) =>
                  href?.startsWith('#src-') ? (
                    <a
                      href={href}
                      className="ml-[0.18em] inline-flex h-[1.15em] min-w-[1.15em] translate-y-[-0.15em] items-center justify-center rounded-[5px] bg-accent-soft px-[0.3em] align-middle font-mono text-[0.68em] font-medium text-accent-ink no-underline transition hover:bg-accent hover:text-white"
                    >
                      {children}
                    </a>
                  ) : (
                    <a href={href} target="_blank" rel="noreferrer">
                      {children}
                    </a>
                  ),
              }}
            >
              {linkCitations(msg.content)}
            </ReactMarkdown>
            {streaming && (
              <span className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[0.15em] bg-accent align-middle [animation:pulse-dot_1s_ease-in-out_infinite]" />
            )}
          </div>

          {!streaming && msg.sources && msg.sources.length > 0 && (
            <Sources sources={msg.sources} cited={cited} />
          )}
        </>
      )}
    </div>
  )
}
