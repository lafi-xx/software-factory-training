import { useState } from "react";
import { useFetcher } from "react-router";
import { Lock, NotebookPen } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Textarea } from "~/components/ui/textarea";
import { MAX_NOTE_LENGTH } from "~/lib/notes";
import { cn, formatRelativeTime } from "~/lib/utils";
import {
  describeNoteDraft,
  type NoteDraftStatus,
} from "~/modules/lesson-notes";

export type SavedNote = { body: string; updatedAt: string } | null;

/** Mount with `key={lessonId}` so the draft resets when the lesson changes. */
export function LessonNote({ note }: { note: SavedNote }) {
  const fetcher = useFetcher<{ ok: boolean; error?: string }>();
  const [draft, setDraft] = useState(note?.body ?? "");
  const [submittedDraft, setSubmittedDraft] = useState<string | null>(null);
  const isSaving = fetcher.state !== "idle";
  // A save error is about the text that was sent; once the learner edits it,
  // the error no longer applies.
  const error = draft === submittedDraft ? fetcher.data?.error : undefined;
  const { length, status, canSave } = describeNoteDraft({
    draft,
    savedBody: note?.body ?? null,
    maxLength: MAX_NOTE_LENGTH,
  });

  return (
    <Card className="mb-8">
      <CardContent className="p-6">
        <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1">
          <NotebookPen className="size-5 text-primary" />
          <h2 className="text-xl font-semibold">Your notes</h2>
          <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
            <Lock className="size-3.5" />
            Private to you
          </span>
        </div>

        <fetcher.Form
          method="post"
          className="space-y-2"
          onSubmit={() => setSubmittedDraft(draft)}
        >
          <input type="hidden" name="intent" value="save-note" />
          <Textarea
            name="body"
            rows={5}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Jot down what you want to remember from this lesson..."
            aria-label="Your notes"
            className="resize-y"
          />
          <NoteFooter
            isSaving={isSaving}
            canSave={canSave}
            status={status}
            length={length}
            error={error}
            updatedAt={note?.updatedAt}
          />
        </fetcher.Form>
      </CardContent>
    </Card>
  );
}

function NoteFooter({
  isSaving,
  canSave,
  status,
  length,
  error,
  updatedAt,
}: {
  isSaving: boolean;
  canSave: boolean;
  status: NoteDraftStatus;
  length: number;
  error: string | undefined;
  updatedAt: string | undefined;
}) {
  return (
    <div className="flex items-center gap-3">
      <Button type="submit" size="sm" disabled={isSaving || !canSave}>
        {isSaving ? "Saving..." : "Save note"}
      </Button>
      <span aria-live="polite">
        <NoteStatus
          error={error}
          unsaved={status === "unsaved"}
          updatedAt={status === "saved" ? updatedAt : undefined}
        />
      </span>
      <span
        className={cn(
          "ml-auto text-xs",
          status === "too-long" ? "text-destructive" : "text-muted-foreground"
        )}
      >
        {length} / {MAX_NOTE_LENGTH}
      </span>
    </div>
  );
}

function NoteStatus({
  error,
  unsaved,
  updatedAt,
}: {
  error: string | undefined;
  unsaved: boolean;
  updatedAt: string | undefined;
}) {
  if (error) return <span className="text-xs text-destructive">{error}</span>;
  if (unsaved)
    return (
      <span className="text-xs text-muted-foreground">Unsaved changes</span>
    );
  if (updatedAt)
    return (
      <span suppressHydrationWarning className="text-xs text-muted-foreground">
        Saved {formatRelativeTime(updatedAt)}
      </span>
    );
  return null;
}
