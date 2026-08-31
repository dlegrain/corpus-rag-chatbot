export type Turn = { role: 'user' | 'assistant'; content: string }

/** 9 = quatre échanges complets plus la question courante. */
const WINDOW = 9

/**
 * Deux pièges que l'API Messages ne pardonne pas, et qui cassaient la
 * conversation en silence :
 *
 * - un bloc de texte vide est refusé. Le client insère une bulle assistant vide
 *   avant de streamer ; si la requête échoue, elle reste vide et repart telle
 *   quelle au tour suivant — la conversation entière devient irrécupérable.
 * - le premier message doit avoir le rôle `user`. Une fenêtre de taille paire
 *   sur un historique alterné commence par un `assistant` un tour sur deux.
 */
export function sanitizeHistory(raw: Turn[] | undefined): Turn[] {
  const clean = (raw ?? [])
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
    .map((m) => ({ role: m.role, content: (m.content ?? '').trim() }))
    .filter((m) => m.content.length > 0)

  const window = clean.slice(-WINDOW)
  while (window.length > 0 && window[0].role !== 'user') window.shift()
  return window
}

export const lastQuestion = (history: Turn[]): string =>
  [...history].reverse().find((m) => m.role === 'user')?.content ?? ''
