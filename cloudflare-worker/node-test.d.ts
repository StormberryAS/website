// Types for the parts of Node that test.ts uses. Type information only: nothing in this file
// is compiled or run, and the Worker never sees it.
//
// Written by hand, as ts/globals.d.ts is for Turnstile, so the repository keeps its one npm
// dependency (typescript). @types/node would be a second, and a large one: it also redeclares
// globals that worker-configuration.d.ts already gives the Workers runtime. tsconfig.json
// loads no @types package, so Node's own declarations are not in scope; this file adds only
// what test.ts calls, after https://nodejs.org/docs/latest-v24.x/api/ .
//
// When test.ts starts using another Node function, declare it here; tools/check-worker.sh
// fails on the missing name until you do.

declare module "node:crypto" {
  interface Hmac {
    update(data: string): Hmac;
    digest(encoding: "base64"): string;
  }
  function createHmac(algorithm: "sha256", key: Uint8Array): Hmac;
  function randomBytes(size: number): Buffer;
}

declare module "node:fs/promises" {
  function readFile(path: string, encoding: "utf8"): Promise<string>;
}

declare module "node:module" {
  // Experimental in Node 24: it prints one ExperimentalWarning when first called.
  function stripTypeScriptTypes(code: string): string;
}

declare module "node:path" {
  function dirname(path: string): string;
  function join(...paths: string[]): string;
}

declare module "node:url" {
  function fileURLToPath(url: string | URL): string;
}

// Node's Buffer, with the two calls the test makes: from a string, and back to base64.
interface Buffer extends Uint8Array {
  toString(encoding?: "base64" | "utf8"): string;
}
declare const Buffer: {
  from(data: string, encoding?: "base64" | "utf8"): Buffer;
};

declare const process: {
  exit(code?: number): never;
};

// import.meta.url, which Node sets for every module loaded from a file.
interface ImportMeta {
  url: string;
}
