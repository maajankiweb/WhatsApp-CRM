export type CannedMediaKind = "image" | "video" | "document" | "audio";

export interface ShortcutMatch {
  query: string;
  startIndex: number;
  word: string;
}

/**
 * Check if the text ending at cursorOffset starts with "/" representing a shortcut trigger.
 * Returns the query, start index, and matched word if triggered, otherwise null.
 */
export function checkShortcutTrigger(
  currentText: string,
  cursorOffset: number,
): ShortcutMatch | null {
  const textBeforeCursor = currentText.slice(0, cursorOffset);
  
  // Find the word preceding the cursor. Slashes are permitted in the shortcut trigger.
  const lastWordMatch = /\S+$/.exec(textBeforeCursor);
  const lastWord = lastWordMatch ? lastWordMatch[0] : "";
  
  if (lastWord.startsWith("/")) {
    const query = lastWord.slice(1).toLowerCase();
    const startIndex = lastWordMatch ? lastWordMatch.index : -1;
    return { query, startIndex, word: lastWord };
  }
  return null;
}

/**
 * Determine the media content type from a public URL.
 */
export function getMediaKindFromUrl(url: string): CannedMediaKind {
  const ext = url.split(".").pop()?.split("?")[0].toLowerCase() || "";
  if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return "image";
  if (["mp4", "3gp"].includes(ext)) return "video";
  if (["mp3", "ogg", "wav", "amr"].includes(ext)) return "audio";
  return "document";
}
