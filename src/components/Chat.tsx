import { useEffect, useRef } from 'react'
import Message from './Message'
import Composer from './Composer'
import EmptyState from './EmptyState'
import type { useChat } from '../hooks/useChat'
import type { Doc } from '../lib/types'

type Props = {
  chat: ReturnType<typeof useChat>
  docs: Doc[]
  scopedDoc: Doc | null
}

export default function Chat({ chat, docs, scopedDoc }: Props) {
  const bottom = useRef<HTMLDivElement>(null)

  /**
   * Les numéros de citation sont stables sur toute la conversation : le modèle
   * peut donc citer au 5e tour une source affichée au 1er. On cherche d'abord
   * dans le message lui-même, puis partout ailleurs — et on rend `null` si la
   * source n'est affichée nulle part, pour ne pas fabriquer un lien mort.
   */
  const ancreDe = (index: number) => (n: number) => {
    if (chat.messages[index]?.sources?.some((s) => s.n === n)) return `src-${index}-${n}`
    const ailleurs = chat.messages.findIndex((m) => m.sources?.some((s) => s.n === n))
    return ailleurs >= 0 ? `src-${ailleurs}-${n}` : null
  }

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [chat.messages.length, chat.busy])

  const empty = chat.messages.length === 0

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {empty && <div className="dotgrid" />}
      <div className="relative min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-5 py-8 lg:px-8">
          {empty ? (
            <EmptyState docs={docs} scopedDoc={scopedDoc} onPick={chat.send} />
          ) : (
            <div className="flex flex-col gap-8">
              {chat.messages.map((m, i) => (
                <Message
                  key={i}
                  msg={m}
                  index={i}
                  ancre={ancreDe(i)}
                  streaming={chat.busy && i === chat.messages.length - 1}
                />
              ))}
            </div>
          )}
          <div ref={bottom} className="h-1" />
        </div>
      </div>

      <Composer
        onSend={chat.send}
        onStop={chat.stop}
        busy={chat.busy}
        disabled={docs.length === 0}
        placeholder={
          docs.length === 0
            ? 'Déposez d’abord un PDF pour interroger le corpus…'
            : scopedDoc
              ? `Question sur ${scopedDoc.authors ?? scopedDoc.title}…`
              : 'Posez votre question au corpus…'
        }
      />
    </div>
  )
}
