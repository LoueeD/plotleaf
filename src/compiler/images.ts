import { createHash } from "node:crypto";
import path from "node:path";
import { imageSize } from "image-size";
import { limits } from "../shared/limits.js";
import type { EmbeddedImage } from "./ir.js";
import { ReportFiles } from "./files.js";

/** Container/header checks; the browser remains the raster decoder. */
function formatOf(bytes: Buffer): "png" | "jpg" {
  if (
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    let offset = 8;
    let data = false;
    while (offset + 12 <= bytes.length) {
      const size = bytes.readUInt32BE(offset);
      const type = bytes.toString("ascii", offset + 4, offset + 8);
      if (offset + size + 12 > bytes.length) break;
      if (offset === 8 && (type !== "IHDR" || size !== 13)) break;
      if (type === "acTL")
        throw new Error(
          "Animated PNG is not supported; provide a static image.",
        );
      if (type === "IDAT" && size > 0) data = true;
      offset += size + 12;
      if (type === "IEND") {
        if (data && size === 0 && offset === bytes.length) return "png";
        break;
      }
    }
    throw new Error("Incomplete or invalid PNG container.");
  }
  if (
    bytes.length >= 4 &&
    bytes.readUInt16BE(0) === 0xffd8 &&
    bytes.readUInt16BE(bytes.length - 2) === 0xffd9
  )
    return "jpg";
  throw new Error(
    "Expected a static PNG or JPEG image with a matching file extension.",
  );
}

export class ImageResolver {
  private readonly attempted = new Set<string>();
  private readonly filesRead = new Map<string, EmbeddedImage>();
  readonly embedded = new Map<string, EmbeddedImage>();
  constructor(private files: ReportFiles) {}

  async load(reference: string): Promise<EmbeddedImage> {
    const requested = path.resolve(this.files.root, reference);
    if (
      !this.attempted.has(requested) &&
      this.attempted.size >= limits.imageFiles
    )
      throw new Error(
        `At most ${limits.imageFiles} local image references are supported.`,
      );
    this.attempted.add(requested);
    const canonical = await this.files.resolve(reference, [
      ".png",
      ".jpg",
      ".jpeg",
    ]);
    const cached = this.filesRead.get(canonical);
    if (cached) {
      if (
        (path.extname(reference).toLowerCase() === ".png") !==
        (cached.mime === "image/png")
      )
        throw new Error("Image signature does not match its file extension.");
      return cached;
    }
    if (this.filesRead.size >= limits.imageFiles)
      throw new Error(
        `At most ${limits.imageFiles} local image files are supported.`,
      );
    const bytes = await this.files.read(canonical, limits.imageBytes);
    const format = formatOf(bytes);
    const expected = (name: string): string =>
      path.extname(name).toLowerCase() === ".png" ? "png" : "jpg";
    if (format !== expected(reference) || format !== expected(canonical))
      throw new Error("Image signature does not match its file extension.");
    let size: ReturnType<typeof imageSize>;
    try {
      size = imageSize(bytes);
    } catch {
      throw new Error("Unsupported or damaged PNG/JPEG header.");
    }
    if (
      size.type !== format ||
      !Number.isSafeInteger(size.width) ||
      !Number.isSafeInteger(size.height) ||
      size.width < 1 ||
      size.height < 1
    )
      throw new Error("Image must have valid positive raster dimensions.");
    if (
      size.width > limits.imageDimension ||
      size.height > limits.imageDimension ||
      size.width * size.height > limits.imagePixels
    )
      throw new Error(
        `Image exceeds ${limits.imageDimension} pixels per side or ${limits.imagePixels.toLocaleString("en-GB")} pixels in total. Resize the prepared asset.`,
      );
    const id = `plotleaf-image-${createHash("sha256").update(bytes).digest("hex")}`;
    const image = this.embedded.get(id) ?? {
      id,
      mime: format === "png" ? "image/png" : "image/jpeg",
      base64: bytes.toString("base64"),
    };
    this.filesRead.set(canonical, image);
    this.embedded.set(id, image);
    return image;
  }
}
