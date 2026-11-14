import * as path from "node:path";
import * as sandcastle from "@ai-hero/sandcastle";
import { noSandbox } from "@ai-hero/sandcastle/sandboxes/no-sandbox";
import { claudeAgent } from "../shared/common";
import { COMPLETION_SIGNAL, withFinishRules } from "../shared/finish";

// Like the one-off implementer: the agent edits and commits, through the
// pre-commit hook; the workflow pushes and opens the PR.
await sandcastle.run({
  name: "build-ticket",
  agent: claudeAgent(),
  sandbox: noSandbox(),
  logging: { type: "stdout" },
  promptFile: withFinishRules(
    path.join(import.meta.dirname, "build-prompt.md")
  ),
  completionSignal: COMPLETION_SIGNAL,
});
