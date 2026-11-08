import { createServer, type ServerResponse } from "node:http";
import chokidar from "chokidar";
import open from "open";
import { compileReport, type Compilation } from "./compiler/compile.js";
import { humanDiagnostics } from "./compiler/diagnostics.js";
import { renderHtml, renderDiagnostics, type Assets } from "./render/html.js";

export interface PreviewOptions {
  port?: number;
  openBrowser?: boolean;
  initial?: Compilation;
  log?: (message: string) => void;
}
export async function startPreview(
  filename: string,
  assets: Assets,
  options: PreviewOptions = {},
) {
  const log = options.log ?? console.log;
  let compilation = options.initial ?? (await compileReport(filename));
  let revision = 0;
  const render = (): string =>
    compilation.report
      ? renderHtml(compilation.report, assets, true, revision)
      : renderDiagnostics(compilation.diagnostics, assets, true, revision);
  let html = render();
  let closed = false;
  let running = false;
  let dirty = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let opened = false;
  const clients = new Set<ServerResponse>();
  let url = "";
  const server = createServer((request, response) => {
    const port = (server.address() as { port: number }).port;
    const authority = request.headers.host?.toLowerCase();
    const allowed = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Cache-Control", "no-store");
    if (
      !authority ||
      !allowed.has(authority) ||
      (request.headers.origin &&
        ![...allowed]
          .map((host) => `http://${host}`)
          .includes(request.headers.origin))
    ) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD" }).end("Method not allowed");
      return;
    }
    let pathname: string;
    try {
      pathname = new URL(request.url ?? "/", `http://127.0.0.1:${port}`)
        .pathname;
    } catch {
      response.writeHead(400).end("Bad request");
      return;
    }
    if (pathname === "/") {
      response
        .writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
        .end(request.method === "HEAD" ? undefined : html);
      return;
    }
    if (pathname === "/favicon.ico") {
      response.writeHead(204).end();
      return;
    }
    if (pathname === "/__plotleaf/events" && request.method === "GET") {
      response.writeHead(200, {
        "Content-Type": "text/event-stream",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      });
      response.write(`event: ready\ndata: ${revision}\n\n`);
      clients.add(response);
      request.on("close", () => clients.delete(response));
      return;
    }
    response.writeHead(404).end("Not found");
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port ?? 0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
  url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const watcher = chokidar.watch([...compilation.dependencies], {
    ignoreInitial: true,
    followSymlinks: false,
    atomic: 100,
    awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 25 },
  });
  await new Promise<void>((resolve) => watcher.once("ready", resolve));
  const openOnce = (): void => {
    if (!options.openBrowser || opened || !compilation.report) return;
    opened = true;
    void open(url).catch(() => log(`Open ${url} in your browser.`));
  };
  async function rebuild(): Promise<void> {
    dirty = true;
    if (running || closed) return;
    running = true;
    try {
      while (dirty && !closed) {
        dirty = false;
        const next = await compileReport(filename);
        if (closed) break;
        const previous = compilation.dependencies;
        compilation = next;
        watcher.add([...next.dependencies]);
        const removed = [...previous].filter(
          (file) => !next.dependencies.has(file),
        );
        if (removed.length) watcher.unwatch(removed);
        revision++;
        html = render();
        for (const client of clients)
          client.write(`event: reload\ndata: ${revision}\n\n`);
        log(
          compilation.report
            ? "Report updated."
            : humanDiagnostics(compilation.diagnostics),
        );
        openOnce();
      }
    } finally {
      running = false;
    }
  }
  watcher.on("all", () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      void rebuild();
    }, 35);
  });
  watcher.on("error", (error) =>
    log(
      `File watcher: ${error instanceof Error ? error.message : String(error)}`,
    ),
  );
  const heartbeat = setInterval(() => {
    for (const client of clients) client.write(": heartbeat\n\n");
  }, 15_000);
  heartbeat.unref();
  async function close(): Promise<void> {
    if (closed) return;
    closed = true;
    if (timer) clearTimeout(timer);
    clearInterval(heartbeat);
    for (const client of clients) client.end();
    clients.clear();
    await watcher.close();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
  log(`plotleaf preview: ${url}`);
  if (!compilation.report) log(humanDiagnostics(compilation.diagnostics));
  openOnce();
  return { url, close, server };
}
