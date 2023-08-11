import { createHash, randomUUID } from "crypto";
import { dirname, join, basename, extname } from "path";
import fs, { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";

export namespace Utils {
  export function getHash(input: string): string {
    return createHash("md5").update(input).digest("hex");
  }

  export function getDir(file: string): string {
    return dirname(file);
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
    return fs.readFileSync(path).toString();
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
}
