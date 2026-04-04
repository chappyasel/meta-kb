/** Load a URL array from config/sources.json by field name. */
export async function loadSourceUrls(field: string): Promise<string[]> {
  const config = await Bun.file("config/sources.json").json();
  return (config as Record<string, string[]>)[field] ?? [];
}
