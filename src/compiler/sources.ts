import type { EmbeddedImage } from "./ir.js";

export class LocalFileError extends Error {
  constructor(
    readonly kind: "path" | "read",
    message: string,
  ) {
    super(message);
  }
}

/** The two I/O operations shared by local files and browser memory. */
export interface SourceFiles {
  resolve(reference: string, extensions: readonly string[]): Promise<string>;
  read(filename: string, maximum: number): Promise<Uint8Array>;
}

export interface SourceImages {
  load(reference: string): Promise<EmbeddedImage>;
  readonly embedded: Map<string, EmbeddedImage>;
}
