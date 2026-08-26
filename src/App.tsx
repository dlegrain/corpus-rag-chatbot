import { useEffect, useState } from 'react'
import Sidebar from './components/Sidebar'
import Chat from './components/Chat'
import TopBar from './components/TopBar'
import DropOverlay from './components/DropOverlay'
import { useDocuments } from './hooks/useDocuments'
import { useChat } from './hooks/useChat'

export default function App() {
  const library = useDocuments()
  const [scope, setScope] = useState<string | null>(null)
  const chat = useChat(scope)
  const [drawer, setDrawer] = useState(false)
  const [dragging, setDragging] = useState(false)

  // Glisser-déposer sur toute la fenêtre
  useEffect(() => {
    let depth = 0
    const onEnter = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes('Files')) return
      depth++
      setDragging(true)
    }
    const onLeave = () => {
      depth = Math.max(0, depth - 1)
      if (depth === 0) setDragging(false)
    }
    const onOver = (e: DragEvent) => e.preventDefault()
    const onDrop = (e: DragEvent) => {
      e.preventDefault()
      depth = 0
      setDragging(false)
      const files = Array.from(e.dataTransfer?.files ?? [])
      if (files.length) library.upload(files)
    }
    window.addEventListener('dragenter', onEnter)
    window.addEventListener('dragleave', onLeave)
    window.addEventListener('dragover', onOver)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragenter', onEnter)
      window.removeEventListener('dragleave', onLeave)
      window.removeEventListener('dragover', onOver)
      window.removeEventListener('drop', onDrop)
    }
  }, [library.upload])

  const scopedDoc = library.docs.find((d) => d.id === scope) ?? null

  return (
    <div className="flex h-full overflow-hidden">
      <Sidebar
        library={library}
        scope={scope}
        onScope={setScope}
        open={drawer}
        onClose={() => setDrawer(false)}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <TopBar
          count={library.docs.length}
          scopedDoc={scopedDoc}
          onClearScope={() => setScope(null)}
          onMenu={() => setDrawer(true)}
          onReset={chat.reset}
          hasMessages={chat.messages.length > 0}
        />
        <Chat chat={chat} docs={library.docs} scopedDoc={scopedDoc} />
      </main>

      {dragging && <DropOverlay />}
    </div>
  )
}
