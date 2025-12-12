export function humanize(args: unknown[]) {
  return args.map((arg) => {
    if (isSecretObject(arg)) {
      return "****";
    }
    return typeof arg === "object" ? JSON.stringify(arg) : arg;
  });
}

function isSecretObject(obj: unknown): boolean {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }

  if ("_secret" in obj) {
    return true;
  }

  return false;
}
