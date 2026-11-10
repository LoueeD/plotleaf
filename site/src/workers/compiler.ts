/// <reference lib="webworker" />
import { config } from "zod";
import { compileMemory } from "../../../src/compiler/memory";
import { renderHtml, inlineScript } from "../../../src/render/document";
import styles from "../../../dist/assets/styles.css?raw";
import base from "../../../dist/assets/base.js?raw";
import charts from "../../../dist/assets/charts.js?raw";
import notices from "../../../dist/assets/notices.txt?raw";

config({ jitless: true });

const scope = self as unknown as DedicatedWorkerGlobalScope;
const assets = { styles, base, charts, notices };
const hashes = new Map<string, string>();
async function prepareHashes() {
  for (const script of [base, charts]) {
    const code = inlineScript(script);
    const digest = new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code)),
    );
    hashes.set(code, btoa(String.fromCharCode(...digest)));
  }
}
const ready = prepareHashes();
void ready
  .then(() => scope.postMessage({ ready: true }))
  .catch(() => scope.postMessage({ initializationError: true }));
scope.onmessage = async (event) => {
  const { id, project } = event.data;
  try {
    await ready;
    const result = await compileMemory(project);
    const html = result.report
      ? renderHtml(result.report, assets, (code) => hashes.get(code)!)
      : undefined;
    scope.postMessage({ id, diagnostics: result.diagnostics, html });
  } catch {
    scope.postMessage({
      id,
      diagnostics: [
        {
          code: "E_PLAYGROUND_COMPILE",
          file: "report.md",
          line: 1,
          column: 1,
          severity: "error",
          message:
            "Could not compile this report. Check its Markdown and JSON.",
        },
      ],
    });
  }
};
