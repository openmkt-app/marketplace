// src/lib/condition-utils.ts
// Utility functions for handling condition values throughout the application

/**
 * Formats a condition ID into a human-readable display name
 * @param condition The condition ID (e.g., 'likeNew', 'new', etc.)
 * @returns A formatted display string (e.g., 'Like New', 'New', etc.)
 */
export function formatConditionForDisplay(condition: string): string {
  const conditionMap: Record<string, string> = {
    'new': 'New',
    'openBox': 'Open Box',
    'likeNew': 'Like New',
    'good': 'Good',
    'fair': 'Fair',
    'forParts': 'For Parts / Not Working',
    // Legacy mapping for backwards compatibility
    'like-new': 'Like New',
    'poor': 'Poor' // Include for backward compatibility but should not be used
  };

  return conditionMap[condition] || condition.charAt(0).toUpperCase() + condition.slice(1);
} 