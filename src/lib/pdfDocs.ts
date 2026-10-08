import { createContext } from 'react'

/** Les documents dont le PDF d'origine est en stockage : leurs sources s'ouvrent à la page citée. */
export const PdfDocs = createContext<Set<string>>(new Set())
