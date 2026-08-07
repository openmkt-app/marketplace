import { Agent } from '@atproto/api';
import { ADMIN_HANDLE } from './constants';

/** The bot and the moderation admin are the same account. */
export const BOT_HANDLE = ADMIN_HANDLE;

// Use a public agent for reads to bypass granular RPC scope limitations
const publicAgent = new Agent({ service: 'https://public.api.bsky.app' });

/**
 * Check if a user is following the marketplace bot
 */
export async function isFollowingBot(
    agent: Agent,
    userDid: string
): Promise<boolean> {
    try {
        // Resolve bot DID publicly
        const profile = await publicAgent.getProfile({ actor: BOT_HANDLE });
        if (!profile.success) return false;
        const botDid = profile.data.did;

        // Check the user's public follow list
        // Since we are moving off transition:generic, we cannot use viewer.following efficiently
        // We will pull the public graph data instead up to 100 records
        const follows = await publicAgent.getFollows({ actor: userDid, limit: 100 });
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
export async function followBot(agent: Agent): Promise<boolean> {
    try {
        // Resolve the bot DID publicly first
        const profile = await publicAgent.getProfile({ actor: BOT_HANDLE });
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

/**
 * Check if the current user is following a specific user (e.g., seller)
 */
export async function isFollowingUser(
    agent: Agent,
    targetDid: string
): Promise<boolean> {
    try {
        if (!agent.did) return false;
        // Check the authenticated user's public follow list for the seller's DID
        const follows = await publicAgent.getFollows({ actor: agent.did, limit: 100 });
        return follows.data.follows.some(f => f.did === targetDid);
    } catch (error) {
        console.error('Error checking if following user:', error);
        return false;
    }
}

/**
 * Follow a specific user
 */
export async function followUser(agent: Agent, targetDid: string): Promise<boolean> {
    try {
        await agent.follow(targetDid);
        return true;
    } catch (error) {
        console.error('Error following user:', error);
        return false;
    }
}
