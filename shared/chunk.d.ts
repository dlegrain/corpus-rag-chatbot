/** Types de `chunk.js` — voir ce fichier pour TARGET / OVERLAP et la logique. */
export declare function chunkPages(
  pages: string[],
): { content: string; page: number; chunk_index: number }[]
