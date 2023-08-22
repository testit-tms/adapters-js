export function humanize(args: unknown[]) {
  return args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg)
}