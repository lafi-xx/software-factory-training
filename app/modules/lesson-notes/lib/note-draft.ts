export type NoteDraftStatus = "empty" | "too-long" | "unsaved" | "saved";

export type NoteDraft = {
  length: number;
  status: NoteDraftStatus;
  canSave: boolean;
};

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
  // The save action trims the body before it checks or stores it, so the
  // draft is judged by what would actually be saved.
  const body = draft.trim();
  const status = statusOf(body, savedBody, maxLength);
  return { length: body.length, status, canSave: status === "unsaved" };
}

function statusOf(
  body: string,
  savedBody: string | null,
  maxLength: number
): NoteDraftStatus {
  if (body.length > maxLength) return "too-long";
  // The save action rejects a blank note, so clearing a saved note is not a save.
  if (body.length === 0) return "empty";
  if (body === savedBody) return "saved";
  return "unsaved";
}
