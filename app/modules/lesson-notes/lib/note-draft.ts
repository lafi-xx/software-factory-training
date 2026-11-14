export type NoteDraftStatus = "empty" | "too-long" | "unsaved" | "saved";

export type NoteDraft = {
  length: number;
  status: NoteDraftStatus;
  canSave: boolean;
};

export function describeDraft(
  draft: string,
  savedBody: string | null,
  maxLength: number
): NoteDraft {
  const length = draft.length;
  const status = statusOf(draft, savedBody, maxLength);
  return { length, status, canSave: status === "unsaved" };
}

function statusOf(
  draft: string,
  savedBody: string | null,
  maxLength: number
): NoteDraftStatus {
  if (draft.length > maxLength) return "too-long";
  // The save action rejects a blank note, so clearing a saved note is not a save.
  if (draft.trim().length === 0) return "empty";
  if (draft === savedBody) return "saved";
  return "unsaved";
}
