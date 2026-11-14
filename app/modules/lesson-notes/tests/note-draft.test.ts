import { describe, it, expect } from "vitest";
import { describeNoteDraft } from "../index";

const maxLength = 10;

describe("describeNoteDraft", () => {
  it("is empty and unsaveable when nothing has been written", () => {
    expect(
      describeNoteDraft({ draft: "", savedBody: null, maxLength })
    ).toEqual({ length: 0, status: "empty", canSave: false });
  });

  it("treats whitespace alone as empty", () => {
    expect(
      describeNoteDraft({ draft: "   ", savedBody: null, maxLength })
    ).toEqual({ length: 0, status: "empty", canSave: false });
  });

  it("is unsaved when the text differs from the saved note", () => {
    expect(
      describeNoteDraft({ draft: "new", savedBody: "old", maxLength })
    ).toEqual({ length: 3, status: "unsaved", canSave: true });
  });

  it("is unsaved for a first note", () => {
    expect(
      describeNoteDraft({ draft: "first", savedBody: null, maxLength })
    ).toEqual({ length: 5, status: "unsaved", canSave: true });
  });

  it("is saved when the text matches the saved note", () => {
    expect(
      describeNoteDraft({ draft: "same", savedBody: "same", maxLength })
    ).toEqual({ length: 4, status: "saved", canSave: false });
  });

  it("is empty, not saveable, when a saved note is cleared", () => {
    expect(
      describeNoteDraft({ draft: "", savedBody: "old", maxLength })
    ).toEqual({ length: 0, status: "empty", canSave: false });
  });

  it("allows a note of exactly the maximum length", () => {
    expect(
      describeNoteDraft({ draft: "a".repeat(10), savedBody: null, maxLength })
    ).toEqual({ length: 10, status: "unsaved", canSave: true });
  });

  it("is too long, and unsaveable, one character over the maximum", () => {
    expect(
      describeNoteDraft({ draft: "a".repeat(11), savedBody: null, maxLength })
    ).toEqual({ length: 11, status: "too-long", canSave: false });
  });

  it("is saved when the draft differs from the saved note only by surrounding whitespace", () => {
    expect(
      describeNoteDraft({ draft: " same\n", savedBody: "same", maxLength })
    ).toEqual({ length: 4, status: "saved", canSave: false });
  });

  it("does not count surrounding whitespace towards the maximum", () => {
    expect(
      describeNoteDraft({
        draft: `${"a".repeat(10)}\n`,
        savedBody: null,
        maxLength,
      })
    ).toEqual({ length: 10, status: "unsaved", canSave: true });
  });
});
