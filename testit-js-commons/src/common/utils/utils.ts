import { createHash, randomUUID } from "crypto";
import { join, basename, extname, posix } from "path";
import fs, { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";

export namespace Utils {
  export function getHash(input: string): string {
    return createHash("md5").update(input).digest("hex");
  }

  /** Normalize path separators to `/` so namespaces match across Windows and Unix. */
  export function toPosixPath(file: string): string {
    return file.replace(/\\/g, "/");
  }

  export function getDir(file: string): string {
    return posix.dirname(toPosixPath(file));
  }

  export function removeDir(path: string): void {
    rmSync(path, { recursive: true });
  }

  export function getFileName(file: string): string {
    return basename(file);
  }

  export function getExtName(path: string) {
    return extname(path);
  }

  export function generateFileName(prefix?: string) {
    return `${prefix || "file"}-${randomUUID()}.txt`;
  }

  export function readFile(path: string): string {
    let fileContents;

    try {
      fileContents = fs.readFileSync(path).toString();
    } catch (err) {
      fileContents = "";
    }

    return fileContents;
  }

  export function writeFile(path: string, content: string): void {
    writeFileSync(path, content);
  }

  export function createTempDir(): string {
    return mkdtempSync(join(tmpdir(), "tms-"));
  }

  export function readStream(path: string): fs.ReadStream {
    return fs.createReadStream(path);
  }

  export function readBufferSync(path: string): Buffer {
    return fs.readFileSync(path);
  }
}
