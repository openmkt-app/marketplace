const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'src/lib/marketplace-client.ts');
let content = fs.readFileSync(p, 'utf8');

if (!content.includes('const publicAgent =')) {
  // Insert publicAgent at top
  content = content.replace("export class MarketplaceClient {", "const publicAgent = new Agent({ service: 'https://public.api.bsky.app' });\n\nexport class MarketplaceClient {");
}

// Replace searchPosts
content = content.replace("await this.agent.api.app.bsky.feed.searchPosts({", "await publicAgent.api.app.bsky.feed.searchPosts({");

// Replace getPostThread
content = content.replace("await this.agent.api.app.bsky.feed.getPostThread({", "await publicAgent.api.app.bsky.feed.getPostThread({");

// Replace getFollows in isUserFollowingMe
content = content.replace("const result = await this.agent.api.app.bsky.graph.getFollows({", "const result = await publicAgent.api.app.bsky.graph.getFollows({");

// Replace getFollowDetails method content
content = content.replace(
`      // 1. Get profile to find the Follow URI
      const profile = await this.agent.getProfile({ actor: targetDid });
      const followUri = profile.data.viewer?.following;

      if (!followUri) {
        return { isFollowing: false };
      }`,
`      // 1. Search our own public graph follows for the targetDid
      const follows = await publicAgent.getFollows({ actor: this.agent.did || '', limit: 100 });
      const followObj = follows.data.follows.find(f => f.did === targetDid);
      
      if (!followObj) {
        return { isFollowing: false };
      }
      
      // We know we follow them. We don't easily have the date without paginating the repo.
      return { isFollowing: true };`
);

fs.writeFileSync(p, content);
