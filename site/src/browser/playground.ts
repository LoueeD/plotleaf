import type { MemoryProject } from "../../../src/compiler/memory";
import { playgroundLimits } from "../../../src/shared/playground";
import type { Diagnostic } from "../../../src/compiler/diagnostic-core";

type Example = {
  slug: string;
  name: string;
  editable: boolean;
  markdown: string;
  files: Record<string, string>;
};
const byId = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const editor = byId<HTMLTextAreaElement>("source-editor");
const fileTabs = byId("file-tabs");
let selectedFile = "report.md";
const examples = byId<HTMLSelectElement>("example-select");
const preview = byId<HTMLIFrameElement>("report-preview");
const download = byId<HTMLButtonElement>("download-report");
const status = byId("compile-status");
const diagnostics = byId<HTMLUListElement>("diagnostics");
const error = byId("playground-error");
let choices: Example[] = [];
let project: MemoryProject = { markdown: "", files: {} };
let worker: Worker | undefined;
let revision = 0;
let debounce: ReturnType<typeof setTimeout>;
let timeout: ReturnType<typeof setTimeout>;
let documentUrl: string | undefined;

function showMessages(messages: Diagnostic[]) {
  const panel = byId<HTMLDetailsElement>("compile-messages");
  panel.hidden = messages.length === 0;
  panel.open = messages.some((item) => item.severity === "error");
  byId("diagnostic-summary").textContent = panel.open
    ? "Validation errors"
    : `${messages.length} ${messages.length === 1 ? "warning" : "warnings"}`;
  diagnostics.replaceChildren();
  for (const item of messages) {
    const li = document.createElement("li");
    const label = document.createElement("strong");
    label.textContent = `${item.file}:${item.line}:${item.column} · ${item.code}`;
    li.append(
      label,
      document.createElement("br"),
      document.createTextNode(item.message),
    );
    if (item.hint) {
      li.append(
        document.createElement("br"),
        document.createTextNode(item.hint),
      );
    }
    diagnostics.append(li);
  }
}
function fail(message: string) {
  download.disabled = true;
  preview.hidden = true;
  status.textContent = "Needs attention";
  showMessages([
    {
      code: "E_PLAYGROUND",
      severity: "error",
      file: "report.md",
      line: 1,
      column: 1,
      message,
    },
  ]);
}
function compile() {
  clearTimeout(debounce);
  clearTimeout(timeout);
  worker?.terminate();
  download.disabled = true;
  error.textContent = "";
  status.textContent = "Rendering…";
  const id = ++revision;
  worker = new Worker(new URL("../workers/compiler.ts", import.meta.url), {
    type: "module",
  });
  timeout = setTimeout(() => {
    if (id !== revision) return;
    worker?.terminate();
    fail(
      "The browser compiler took too long to load. Check the connection or use the CLI.",
    );
  }, 20000);
  worker.onerror = () => {
    if (id !== revision) return;
    clearTimeout(timeout);
    fail(
      "The browser compiler could not start. Try reloading, or use the CLI.",
    );
  };
  worker.onmessage = (event) => {
    if (id !== revision) return;
    if (event.data.initializationError) {
      clearTimeout(timeout);
      fail(
        "The compiler needs a secure browser context. Use HTTPS or localhost.",
      );
      return;
    }
    if (event.data.ready) {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (id !== revision) return;
        worker?.terminate();
        fail(
          "Compilation took too long. Reduce the input or reset to an example.",
        );
      }, playgroundLimits.timeoutMs);
      worker?.postMessage({ id, project });
      return;
    }
    if (event.data.id !== id) return;
    clearTimeout(timeout);
    showMessages(event.data.diagnostics);
    if (!event.data.html) {
      preview.hidden = true;
      status.textContent = "Needs attention";
      return;
    }
    if (documentUrl) URL.revokeObjectURL(documentUrl);
    documentUrl = URL.createObjectURL(
      new Blob([event.data.html], { type: "text/html" }),
    );
    preview.onload = () => {
      preview.onload = null;
      preview.contentWindow?.postMessage(
        { type: "plotleaf-preview", html: event.data.html },
        "*",
      );
    };
    preview.src = "/playground-preview/";
    preview.hidden = false;
    download.disabled = false;
    status.textContent = event.data.diagnostics.length
      ? "Ready with warnings"
      : "Ready";
  };
}
function storeEdit() {
  if (selectedFile === "report.md") project.markdown = editor.value;
  else project.files[selectedFile] = editor.value;
}
function fillFiles(selected = "report.md") {
  selectedFile = selected;
  fileTabs.replaceChildren(
    ...["report.md", ...Object.keys(project.files)].map((name, index) => {
      const tab = document.createElement("button");
      tab.type = "button";
      tab.role = "tab";
      tab.id = `file-tab-${index}`;
      tab.textContent = name;
      tab.setAttribute("aria-selected", String(name === selected));
      tab.setAttribute("aria-controls", "source-editor");
      tab.tabIndex = name === selected ? 0 : -1;
      tab.addEventListener("click", () => {
        fillFiles(name);
        fileTabs
          .querySelector<HTMLButtonElement>('[aria-selected="true"]')!
          .focus();
      });
      return tab;
    }),
  );
  editor.setAttribute(
    "aria-labelledby",
    fileTabs.querySelector('[aria-selected="true"]')!.id,
  );
  editor.value =
    selected === "report.md" ? project.markdown : project.files[selected]!;
  byId<HTMLButtonElement>("delete-file").disabled = selected === "report.md";
  editor.setAttribute("aria-label", `Edit ${selected}`);
}
function loadExample() {
  const example = choices.find((item) => item.slug === examples.value)!;
  if (!example) return;
  project = { markdown: example.markdown, files: { ...example.files } };
  fillFiles();
  compile();
}
editor.addEventListener("input", () => {
  ++revision;
  worker?.terminate();
  clearTimeout(timeout);
  storeEdit();
  download.disabled = true;
  status.textContent = "Editing…";
  clearTimeout(debounce);
  debounce = setTimeout(compile, 400);
});
fileTabs.addEventListener("keydown", (event) => {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const tabs = [
    ...fileTabs.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
  ];
  const index = tabs.findIndex(
    (tab) => tab.getAttribute("aria-selected") === "true",
  );
  const next =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? tabs.length - 1
        : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) %
          tabs.length;
  fillFiles(tabs[next]!.textContent!);
  fileTabs.querySelector<HTMLButtonElement>('[aria-selected="true"]')!.focus();
});
examples.addEventListener("change", loadExample);
byId("reset-example").addEventListener("click", loadExample);
const addDialog = byId<HTMLDialogElement>("add-file-dialog");
byId("add-file-tab").addEventListener("click", () => {
  byId("new-file-error").textContent = "";
  addDialog.showModal();
  byId<HTMLInputElement>("new-file").focus();
});
byId("cancel-add-file").addEventListener("click", () => addDialog.close());
byId("add-file-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = byId<HTMLInputElement>("new-file");
  const name = input.value.trim();
  if (
    !/^[A-Za-z0-9][A-Za-z0-9_. -]*\.json$/.test(name) ||
    Object.hasOwn(project.files, name)
  ) {
    byId("new-file-error").textContent =
      "Choose a new plain JSON filename, such as data.json.";
    return;
  }
  if (Object.keys(project.files).length >= playgroundLimits.files) {
    byId("new-file-error").textContent = "At most 16 JSON files are supported.";
    return;
  }
  project.files[name] = "[]";
  input.value = "";
  addDialog.close();
  fillFiles(name);
  compile();
});
byId("delete-file").addEventListener("click", () => {
  if (selectedFile === "report.md") return;
  delete project.files[selectedFile];
  fillFiles();
  compile();
});
byId<HTMLInputElement>("open-files").addEventListener(
  "change",
  async (event) => {
    const input = event.target as HTMLInputElement;
    const files = [...(input.files ?? [])];
    try {
      if (!files.length) return;
      if (
        files.reduce((total, file) => total + file.size, 0) >
          playgroundLimits.bytes ||
        files.filter((file) => file.name.toLowerCase().endsWith(".json"))
          .length > playgroundLimits.files
      )
        throw new Error("Choose at most 1 MiB and 16 JSON files.");
      if (
        files.some(
          (file) =>
            !/^[A-Za-z0-9][A-Za-z0-9_. -]*\.(md|json)$/i.test(file.name),
        ) ||
        files.filter((file) => file.name.toLowerCase().endsWith(".md")).length >
          1
      )
        throw new Error("Choose one Markdown report and plain JSON files.");
      const next: MemoryProject = {
        markdown: project.markdown,
        files: files.some((file) => file.name.toLowerCase().endsWith(".md"))
          ? {}
          : { ...project.files },
      };
      const incoming = new Set<string>();
      for (const file of files) {
        const text = new TextDecoder("utf-8", { fatal: true }).decode(
          await file.arrayBuffer(),
        );
        if (file.name.toLowerCase().endsWith(".md")) next.markdown = text;
        else {
          if (incoming.has(file.name))
            throw new Error("Duplicate filenames are not supported.");
          incoming.add(file.name);
          next.files[file.name] = text;
        }
      }
      project = next;
      fillFiles();
      compile();
    } catch (e) {
      error.textContent =
        e instanceof Error ? e.message : "Cannot open these files.";
    } finally {
      input.value = "";
    }
  },
);
download.addEventListener("click", () => {
  if (!documentUrl || download.disabled) return;
  const a = document.createElement("a");
  a.href = documentUrl;
  a.download = "report.html";
  a.click();
});
window.addEventListener("pagehide", () => {
  worker?.terminate();
  clearTimeout(debounce);
  clearTimeout(timeout);
  if (documentUrl) URL.revokeObjectURL(documentUrl);
});
async function start() {
  try {
    const response = await fetch("/playground-projects.json");
    if (!response.ok) throw new Error();
    choices = (await response.json()).filter((item: Example) => item.editable);
    examples.replaceChildren(
      ...choices.map((item) => new Option(item.name, item.slug)),
    );
    const requested = new URLSearchParams(location.search).get("example");
    examples.value = choices.some((item) => item.slug === requested)
      ? requested!
      : choices[0]!.slug;
    byId("playground").hidden = false;
    loadExample();
  } catch {
    byId("playground").hidden = false;
    fail("Examples could not be loaded. Refresh the page to try again.");
  }
}
void start();

const grid = byId("play-grid");
const resizer = byId("pane-resizer");
let split = 45;
function resize(value: number) {
  split = Math.max(20, Math.min(80, value));
  grid.style.setProperty("--editor-width", `${split}%`);
  resizer.setAttribute("aria-valuenow", String(Math.round(split)));
}
resizer.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  event.preventDefault();
  resizer.setPointerCapture(event.pointerId);
  grid.classList.add("resizing");
});
resizer.addEventListener("pointermove", (event) => {
  if (!resizer.hasPointerCapture(event.pointerId)) return;
  const box = grid.getBoundingClientRect();
  resize(((event.clientX - box.left) / box.width) * 100);
});
function finishResize() {
  grid.classList.remove("resizing");
}
resizer.addEventListener("pointerup", (event) => {
  if (resizer.hasPointerCapture(event.pointerId))
    resizer.releasePointerCapture(event.pointerId);
  finishResize();
});
resizer.addEventListener("lostpointercapture", finishResize);
resizer.addEventListener("pointercancel", finishResize);
resizer.addEventListener("keydown", (event) => {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  resize(
    event.key === "Home"
      ? 20
      : event.key === "End"
        ? 80
        : split + (event.key === "ArrowLeft" ? -2 : 2),
  );
});
