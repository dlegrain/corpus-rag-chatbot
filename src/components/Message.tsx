import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Sources from './Sources'
import { citedNumbers, linkCitations } from '../lib/citations'
import type { Msg } from '../lib/types'

type Props = {
  msg: Msg
  streaming: boolean
  index: number
  /** Où pointe le renvoi `[n]` — éventuellement dans un message précédent. */
  ancre: (n: number) => string | null
}

export default function Message({ msg, streaming, index, ancre }: Props) {
  const anchor = `src-${index}`

  if (msg.role === 'user') {
    return (
      <div className="animate-rise flex justify-end">
        <div className="max-w-[85%] rounded-xl rounded-br-xs bg-accent px-4 py-2.5 text-corps leading-[1.55] text-accent-ink">
          {msg.content}
        </div>
      </div>
    )
  }

  const cited = citedNumbers(msg.content)

  return (
    <div className="animate-rise">
      {msg.error ? (
        <div className="rounded-xl border border-rouge-bord bg-rouge-soft px-4 py-3 text-note leading-normal text-ink-soft">
          <p className="mb-1 text-etiquette font-bold tracking-[0.08em] text-rouge uppercase">Erreur</p>
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
                      className="cite"
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
              {linkCitations(msg.content, ancre)}
            </ReactMarkdown>
            {streaming && (
              <span className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[0.15em] bg-accent align-middle [animation:pulse-dot_1s_ease-in-out_infinite]" />
            )}
          </div>

          {!streaming && msg.sources && msg.sources.length > 0 && (
            <Sources sources={msg.sources} cited={cited} anchor={anchor} />
          )}
        </>
      )}
    </div>
  )
}
