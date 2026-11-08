import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  lstat,
  stat,
  realpath,
  mkdir,
  writeFile,
  rename,
  rm,
} from "node:fs/promises";

export async function writeReport(
  filename: string,
  html: string,
  inputs: Set<string>,
): Promise<string> {
  const destination = path.resolve(filename);
  if (path.extname(destination).toLowerCase() !== ".html")
    throw new Error("Output must have an .html extension.");
  let existing: Awaited<ReturnType<typeof stat>> | undefined;
  try {
    const info = await lstat(destination);
    if (info.isSymbolicLink())
      throw new Error(
        "Refusing a symbolic-link output destination. Choose a regular .html path.",
      );
    if (!info.isFile())
      throw new Error("Output destination is not a regular file.");
    existing = info;
  } catch (error) {
    if (!(
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ))
      throw error;
  }
  let directory = path.dirname(destination);
  const missing: string[] = [];
  while (true) {
    try {
      directory = await realpath(directory);
      break;
    } catch (error) {
      if (!(
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "ENOENT"
      ))
        throw error;
      missing.unshift(path.basename(directory));
      const parent = path.dirname(directory);
      if (parent === directory) throw error;
      directory = parent;
    }
  }
  const canonical = path.join(
    directory,
    ...missing,
    path.basename(destination),
  );
  for (const input of inputs) {
    if (
      path.resolve(input) === canonical ||
      path.resolve(input) === destination
    )
      throw new Error("Output would overwrite a report input or dependency.");
    if (existing) {
      try {
        const source = await stat(input);
        if (source.dev === existing.dev && source.ino === existing.ino)
          throw new Error(
            "Output is a hard link to a report input or dependency.",
          );
      } catch (error) {
        if (!(
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === "ENOENT"
        ))
          throw error;
      }
    }
  }
  await mkdir(path.dirname(destination), { recursive: true });
  const temporary = path.join(
    path.dirname(destination),
    `.plotleaf-${randomUUID()}.tmp`,
  );
  try {
    await writeFile(temporary, html, {
      encoding: "utf8",
      mode: 0o600,
      flag: "wx",
    });
    await rename(temporary, destination);
  } finally {
    await rm(temporary, { force: true });
  }
  return destination;
}
