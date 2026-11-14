import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

// Sandcastle waits for the agent's process to exit, and kills the run after
// ten silent minutes. A dev server or agent-browser's Chrome daemon left
// running can keep that process alive after the final message, so a finished
// run dies as idle. Two guards: the agent stops what it started, and it ends
// with Sandcastle's completion signal, which force-completes the run 60s after
// it appears even if something is still hanging on.
export const COMPLETION_SIGNAL = "<promise>COMPLETE</promise>";

export const FINISH_RULES = [
  "",
  "",
  "## Finishing",
  "",
  "Before your final message, stop everything you started in the background: run `agent-browser close`, and kill any dev server or other long-running process you launched.",
  "",
  `End your final message with ${COMPLETION_SIGNAL} on a line of its own.`,
].join("\n");

// A copy of the prompt file with the finishing rules appended, so
// `promptArgs` substitution still applies to it.
export const withFinishRules = (promptFile: string): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "finish-rules-"));
  const copy = path.join(dir, path.basename(promptFile));
  fs.writeFileSync(
    copy,
    `${fs.readFileSync(promptFile, "utf8")}${FINISH_RULES}`
  );
  return copy;
};
