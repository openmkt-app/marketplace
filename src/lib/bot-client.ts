import { BskyAgent } from '@atproto/api';

const BOT_HANDLE = process.env.BOT_HANDLE;
const BOT_APP_PASSWORD = process.env.BOT_APP_PASSWORD;

let botAgent: BskyAgent | null = null;

export async function getBotAgent() {
    if (botAgent) return botAgent;

    if (!BOT_HANDLE || !BOT_APP_PASSWORD) {
        throw new Error('Bot credentials not configured');
    }

    const agent = new BskyAgent({
        service: 'https://bsky.social',
    });

    try {
        await agent.login({
            identifier: BOT_HANDLE,
            password: BOT_APP_PASSWORD,
        });

        botAgent = agent;
        return agent;
    } catch (error) {
        console.error('Failed to login bot:', error);
        throw error;
    }
}
