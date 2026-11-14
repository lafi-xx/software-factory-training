import * as path from "node:path";
import * as sandcastle from "@ai-hero/sandcastle";
import { noSandbox } from "@ai-hero/sandcastle/sandboxes/no-sandbox";
import { claudeAgent, writeJson } from "../shared/common";
import { COMPLETION_SIGNAL, withFinishRules } from "../shared/finish";
import { extractionPrompt } from "../shared/extraction-prompt";
import { runWithExtraction } from "../shared/run-with-extraction";
import { explorePlanSchema } from "./plan-schema";

const result = await runWithExtraction({
  name: "explore",
  agent: claudeAgent(),
  sandbox: noSandbox(),
  logging: { type: "stdout" },
  promptFile: withFinishRules(path.join(import.meta.dirname, "prompt.md")),
  completionSignal: COMPLETION_SIGNAL,
  output: sandcastle.Output.object({ tag: "plan", schema: explorePlanSchema }),
  extractionPrompt: extractionPrompt("plan", explorePlanSchema),
});

writeJson("plan.json", result.output);
