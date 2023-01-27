export function safetyUseISOString(date: number | null): string {
  if (!date) {
    return;
  }

  return new Date(date).toISOString()
}