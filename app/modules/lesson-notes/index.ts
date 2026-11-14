import { describeDraft, type NoteDraft } from "./lib/note-draft";

export type { NoteDraft, NoteDraftStatus } from "./lib/note-draft";

/**
 * What the note editor should show for the text in the box: its length,
 * whether it differs from the saved note, and whether Save may be pressed.
 */
export function describeNoteDraft({
  draft,
  savedBody,
  maxLength,
}: {
  draft: string;
  savedBody: string | null;
  maxLength: number;
}): NoteDraft {
  return describeDraft(draft, savedBody, maxLength);
}
