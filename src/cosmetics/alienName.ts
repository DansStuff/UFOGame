/**
 * Turns a player's name into its nameplate text: the first 'a', plus any 'y's
 * right after it, becomes 'AYY', and the last 'l' becomes 'LMAO'. Matching
 * ignores case. Each rule applies on its own, and a name with neither letter
 * is returned unchanged ("Kyle" -> "KyLMAOe", "Daniel" -> "DAYYnieLMAO").
 */
import { NAMEPLATE_AYY_TEXT, NAMEPLATE_LMAO_TEXT } from './constants'

/** A run of the displayed name. `alien` marks a replacement ('AYY' or 'LMAO'). */
export type NamePart = { text: string; alien: boolean }

type Replacement = { start: number; end: number; text: string }

/** The displayed name split into original runs and replacement runs, in order. */
export function alienizeNameParts(name: string): NamePart[] {
  const replacements: Replacement[] = []

  const aMatch = /a[yY]*/i.exec(name)
  if (aMatch) {
    replacements.push({ start: aMatch.index, end: aMatch.index + aMatch[0].length, text: NAMEPLATE_AYY_TEXT })
  }

  const lIndex = name.toLowerCase().lastIndexOf('l')
  if (lIndex >= 0) replacements.push({ start: lIndex, end: lIndex + 1, text: NAMEPLATE_LMAO_TEXT })

  // Both spans come from the original name and never overlap ('l' is not 'a' or 'y').
  replacements.sort((a, b) => a.start - b.start)

  const parts: NamePart[] = []
  let cursor = 0
  for (const { start, end, text } of replacements) {
    if (start > cursor) parts.push({ text: name.slice(cursor, start), alien: false })
    parts.push({ text, alien: true })
    cursor = end
  }
  if (cursor < name.length) parts.push({ text: name.slice(cursor), alien: false })
  return parts
}

/** The displayed name as plain text. */
export function alienizeName(name: string): string {
  return alienizeNameParts(name)
    .map((part) => part.text)
    .join('')
}
