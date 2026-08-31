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

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [chat.messages.length, chat.busy])

  const empty = chat.messages.length === 0

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
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
