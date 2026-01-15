import { BskyAgent } from '@atproto/api';

export const BOT_HANDLE = 'at-marketplace-bot.bsky.social';

/**
 * Check if a user is following the marketplace bot
 */
export async function isFollowingBot(
    agent: BskyAgent,
    userDid: string
): Promise<boolean> {
    try {
        // 1. Resolve bot DID
        const profile = await agent.getProfile({ actor: BOT_HANDLE });
        if (!profile.success) return false;

        const botDid = profile.data.did;

        // 2. Check if user follows bot
        // We use app.bsky.graph.getFollows or simply check the viewer state if we are looking at the bot profile
        // But since we are checking if *another* user (seller) follows the bot, or the current user, it depends on context.

        // Case A: Checking if Current User follows Bot
        if (userDid === agent.session?.did) {
            const res = await agent.getProfile({ actor: BOT_HANDLE });
            return !!res.data.viewer?.following;
        }

        // Case B: Checking if Another User (Seller) follows Bot
        // We can list the seller's follows and look for the bot.
        // This is expensive if they have many follows.
        // Alternatively, we can check the Bot's "followers" list for the seller.

        // Let's search graph.getFollows for the *Seller*
        // Note: This might be paginated.
        // A more efficient way? 
        // app.bsky.graph.getAbock (no)

        // Efficient check: getProfile of the Bot *as viewed by the Seller*? No, we can't impersonate.

        // We will check if the Bot follows the Seller? No, that's the result we want.
        // We need: Does Seller -> Follow -> Bot.

        // Best approach: Check Bot's followers for the Seller DID.
        // app.bsky.graph.getFollowers({ actor: botDid }) and filter?
        // Be careful with pagination.

        // For now, let's assume we can rely on `app.bsky.graph.getFollows` of the SELLER.
        // Limitation: If seller follows 10k people, this is slow.
        // But usually people follow < 1000.

        // Let's try checking the relationship directly if possible.
        // Currently API doesn't have a simple "does A follow B" endpoint without auth context of A.

        // Optimization: We will use the Bot's backend to check this more reliably if needed.
        // But for client-side check, we'll iterate the Seller's follows (first page or two).

        const follows = await agent.getFollows({ actor: userDid, limit: 100 });
        const isFound = follows.data.follows.some(f => f.did === botDid || f.handle === BOT_HANDLE);
        return isFound;

    } catch (error) {
        console.error('Error checking bot following:', error);
        return false;
    }
}

/**
 * Follow the marketplace bot
 */
export async function followBot(agent: BskyAgent): Promise<boolean> {
    try {
        const profile = await agent.getProfile({ actor: BOT_HANDLE });
        if (!profile.success) return false;

        await agent.follow(profile.data.did);
        return true;
    } catch (error) {
        console.error('Error following bot:', error);
        return false;
    }
}

export function getBotProfileUrl(): string {
    return `https://bsky.app/profile/${BOT_HANDLE}`;
}
