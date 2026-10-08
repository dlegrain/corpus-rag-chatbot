import { useEffect, useMemo, useState } from 'react'
import Sidebar from './components/Sidebar'
import Chat from './components/Chat'
import TopBar from './components/TopBar'
import DropOverlay from './components/DropOverlay'
import { useDocuments } from './hooks/useDocuments'
import { useChat } from './hooks/useChat'
import { PdfDocs } from './lib/pdfDocs'

export default function App() {
  const library = useDocuments()
  /**
   * Les documents cochés ; vide = tout le corpus. Volontairement pas conservé
   * d'une visite à l'autre : un périmètre oublié qui survit en silence est le
   * piège à éviter — chaque visite repart sur tout le corpus.
   */
  const [scope, setScope] = useState<string[]>([])
  const toggleScope = (id: string) =>
    setScope((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  const clearScope = () => setScope([])
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

  // Un document retiré du corpus entre-temps disparaît de la sélection de lui-même.
  const scopedDocs = library.docs.filter((d) => scope.includes(d.id))
  const avecPdf = useMemo(() => new Set(library.docs.filter((d) => d.has_pdf).map((d) => d.id)), [library.docs])

  return (
    <PdfDocs.Provider value={avecPdf}>
    <div className="flex h-full overflow-hidden">
      <Sidebar
        library={library}
        scope={scope}
        onToggle={toggleScope}
        onClear={clearScope}
        open={drawer}
        onClose={() => setDrawer(false)}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <TopBar
          count={library.docs.length}
          scopedDocs={scopedDocs}
          onClearScope={clearScope}
          onMenu={() => setDrawer(true)}
          onReset={chat.reset}
          hasMessages={chat.messages.length > 0}
        />
        <Chat chat={chat} docs={library.docs} scopedDocs={scopedDocs} />
      </main>

      {dragging && <DropOverlay />}
    </div>
    </PdfDocs.Provider>
  )
}
