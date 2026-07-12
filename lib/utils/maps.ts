export function appleMapsSearchUrl(name: string, location?: string | null): string {
  const query = [name.trim(), location?.trim()].filter(Boolean).join(", ");
  return `https://maps.apple.com/?q=${encodeURIComponent(query)}`;
}
