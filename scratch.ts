import { Agent } from '@atproto/api';
const publicAgent = new Agent({ service: 'https://public.api.bsky.app' });
publicAgent.getProfile({ actor: 'openmkt.app' }).then(res => {
  console.log("Success:", res.data.handle);
}).catch(err => {
  console.error("Error:", err);
});
