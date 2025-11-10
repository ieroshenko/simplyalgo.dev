export function normalizeCode(code: string | null | undefined): string {
  if (typeof code !== 'string') return '';
  // Collapse any whitespace (spaces, tabs, newlines) to a single space and trim
  return code.replace(/\s+/g, ' ').trim();
}

