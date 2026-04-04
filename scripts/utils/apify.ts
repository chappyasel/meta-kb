import { ApifyClient } from "apify-client";

let client: ApifyClient | null = null;

function getClient(): ApifyClient {
  if (!client) {
    const token = process.env.APIFY_API_TOKEN;
    if (!token) throw new Error("APIFY_API_TOKEN is required. Set it in .env");
    client = new ApifyClient({ token });
  }
  return client;
}

export async function runApifyActor(
  actorId: string,
  input: Record<string, unknown>,
  opts: { maxItems?: number; waitSecs?: number } = {},
): Promise<Record<string, unknown>[]> {
  const { maxItems = 100, waitSecs = 120 } = opts;

  console.log(`  running Apify actor ${actorId}...`);
  const run = await getClient()
    .actor(actorId)
    .call(input, { waitSecs });

  const { items } = await getClient()
    .dataset(run.defaultDatasetId)
    .listItems({ limit: maxItems });

  console.log(`  got ${items.length} items from Apify`);
  return items as Record<string, unknown>[];
}
