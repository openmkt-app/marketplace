/**
 * Simple in-memory rate limiter for interest requests
 *
 * Note: This is an in-memory implementation suitable for single-server deployments.
 * For production with multiple servers, consider using Redis or a similar distributed store.
 */

interface RateLimitEntry {
  timestamps: number[];
}

// In-memory store for rate limiting
const rateLimitStore: Map<string, RateLimitEntry> = new Map();

// Configuration
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour in milliseconds
const MAX_REQUESTS_PER_WINDOW = 5;

/**
 * Clean up old entries from a user's timestamp array
 */
function cleanOldTimestamps(timestamps: number[], windowMs: number): number[] {
  const now = Date.now();
  return timestamps.filter(ts => now - ts < windowMs);
}

/**
 * Check if a user is rate limited and record the request if not
 * @param userId - The user's DID or other unique identifier
 * @returns Object with isLimited status and remaining requests/time info
 */
export function checkRateLimit(userId: string): {
  isLimited: boolean;
  remainingRequests: number;
  resetInMinutes: number;
  message?: string;
} {
  const now = Date.now();

  // Get or create entry for this user
  let entry = rateLimitStore.get(userId);

  if (!entry) {
    entry = { timestamps: [] };
    rateLimitStore.set(userId, entry);
  }

  // Clean up old timestamps
  entry.timestamps = cleanOldTimestamps(entry.timestamps, RATE_LIMIT_WINDOW_MS);

  // Check if rate limited
  if (entry.timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    // Calculate when the oldest request will expire
    const oldestTimestamp = Math.min(...entry.timestamps);
    const resetTime = oldestTimestamp + RATE_LIMIT_WINDOW_MS;
    const resetInMs = resetTime - now;
    const resetInMinutes = Math.ceil(resetInMs / (60 * 1000));

    return {
      isLimited: true,
      remainingRequests: 0,
      resetInMinutes,
      message: `You've reached the limit of ${MAX_REQUESTS_PER_WINDOW} interest requests per hour. Please wait ${resetInMinutes} minutes before trying again.`
    };
  }

  // Not rate limited - record this request
  entry.timestamps.push(now);

  return {
    isLimited: false,
    remainingRequests: MAX_REQUESTS_PER_WINDOW - entry.timestamps.length,
    resetInMinutes: 60 // Full window
  };
}

/**
 * Get current rate limit status without recording a request
 * Useful for showing remaining requests to the user
 */
export function getRateLimitStatus(userId: string): {
  requestsUsed: number;
  remainingRequests: number;
  resetInMinutes: number;
} {
  const now = Date.now();
  const entry = rateLimitStore.get(userId);

  if (!entry) {
    return {
      requestsUsed: 0,
      remainingRequests: MAX_REQUESTS_PER_WINDOW,
      resetInMinutes: 60
    };
  }

  // Clean up old timestamps
  const cleanedTimestamps = cleanOldTimestamps(entry.timestamps, RATE_LIMIT_WINDOW_MS);

  // Calculate reset time
  let resetInMinutes = 60;
  if (cleanedTimestamps.length > 0) {
    const oldestTimestamp = Math.min(...cleanedTimestamps);
    const resetTime = oldestTimestamp + RATE_LIMIT_WINDOW_MS;
    resetInMinutes = Math.ceil((resetTime - now) / (60 * 1000));
  }

  return {
    requestsUsed: cleanedTimestamps.length,
    remainingRequests: MAX_REQUESTS_PER_WINDOW - cleanedTimestamps.length,
    resetInMinutes
  };
}

/**
 * Periodically clean up the rate limit store to prevent memory leaks
 * Call this on a timer (e.g., every hour)
 */
export function cleanupRateLimitStore(): void {
  const userIds = Array.from(rateLimitStore.keys());

  for (const userId of userIds) {
    const entry = rateLimitStore.get(userId);
    if (!entry) continue;

    entry.timestamps = cleanOldTimestamps(entry.timestamps, RATE_LIMIT_WINDOW_MS);

    // Remove entry if no recent timestamps
    if (entry.timestamps.length === 0) {
      rateLimitStore.delete(userId);
    }
  }
}

// Export configuration for reference
export const RATE_LIMIT_CONFIG = {
  windowMs: RATE_LIMIT_WINDOW_MS,
  maxRequests: MAX_REQUESTS_PER_WINDOW
};
