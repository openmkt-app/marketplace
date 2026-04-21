import { Agent } from '@atproto/api';
const publicAgent = new Agent({ service: 'https://public.api.bsky.app' });
async function run() {
  const follows = await publicAgent.getFollows({ actor: 'openmkt.app', limit: 5 });
  console.log("Follows:", follows.data.follows.length);
}
run();
