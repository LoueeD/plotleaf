import path from "node:path";
import { open, realpath, stat } from "node:fs/promises";
import { limits } from "../shared/limits.js";

export class LocalFileError extends Error {
  constructor(
    readonly kind: "path" | "read",
    message: string,
  ) {
    super(message);
  }
}

export function contained(root: string, filename: string): boolean {
  const relative = path.relative(root, filename);
  return (
    relative === "" ||
    (!path.isAbsolute(relative) &&
      relative !== ".." &&
      !relative.startsWith(`..${path.sep}`))
  );
}

export async function readBytesBounded(
  filename: string,
  maximum: number,
): Promise<Buffer> {
  if (!(await stat(filename)).isFile())
    throw new Error("Expected a regular file.");
  const file = await open(filename, "r");
  try {
    const info = await file.stat();
    if (!info.isFile()) throw new Error("Expected a regular file.");
    if (info.size > maximum)
      throw new Error(
        `File exceeds the ${Math.floor(maximum / 1024)} KiB size limit.`,
      );
    const chunks: Buffer[] = [];
    let bytes = 0;
    while (bytes <= maximum) {
      const buffer = Buffer.alloc(Math.min(64 * 1024, maximum + 1 - bytes));
      const result = await file.read(buffer, 0, buffer.length, null);
      if (!result.bytesRead) break;
      chunks.push(buffer.subarray(0, result.bytesRead));
      bytes += result.bytesRead;
    }
    if (bytes > maximum)
      throw new Error("File grew beyond the size limit while reading.");
    return Buffer.concat(chunks, bytes);
  } finally {
    await file.close();
  }
}

export async function readBounded(
  filename: string,
  maximum: number,
): Promise<{ text: string; bytes: number }> {
  const bytes = await readBytesBounded(filename, maximum);
  return {
    text: new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    bytes: bytes.length,
  };
}

/** JSON and image reads share path isolation, attempted watches and one byte budget. */
export class ReportFiles {
  constructor(
    readonly root: string,
    readonly dependencies: Set<string>,
    private usedBytes: number,
  ) {}

  async resolve(
    reference: string,
    extensions: readonly string[],
  ): Promise<string> {
    const fail = (message: string): never => {
      throw new LocalFileError("path", message);
    };
    if (
      path.isAbsolute(reference) ||
      /^[A-Za-z][A-Za-z\d+.-]*:/.test(reference) ||
      reference.includes("\\") ||
      /%[\da-f]{2}/i.test(reference) ||
      reference.includes("\0")
    )
      fail(`Use a plain relative local ${extensions.join("/")} path.`);
    const candidate = path.resolve(this.root, reference);
    const hidden = (filename: string): boolean =>
      path
        .relative(this.root, filename)
        .split(path.sep)
        .some((part) => part.startsWith("."));
    if (!contained(this.root, candidate))
      fail("Reference escapes the report directory.");
    if (hidden(candidate))
      fail("Hidden files and directories are not allowed.");
    if (!extensions.includes(path.extname(candidate).toLowerCase()))
      fail(`Use a ${extensions.join("/")} file.`);
    this.dependencies.add(candidate);
    let canonical: string;
    try {
      canonical = await realpath(candidate);
    } catch {
      throw new LocalFileError(
        "read",
        "Cannot read the referenced file. Create it or correct the reference.",
      );
    }
    if (!contained(this.root, canonical) || hidden(canonical))
      fail("The resolved file or symlink escapes the permitted report files.");
    if (!extensions.includes(path.extname(canonical).toLowerCase()))
      fail(
        `The resolved file must also have a ${extensions.join("/")} extension.`,
      );
    this.dependencies.add(canonical);
    return canonical;
  }

  async read(filename: string, maximum: number): Promise<Buffer> {
    const bytes = await readBytesBounded(
      filename,
      Math.min(maximum, limits.totalBytes - this.usedBytes),
    );
    this.usedBytes += bytes.length;
    return bytes;
  }
}
