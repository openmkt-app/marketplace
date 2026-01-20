import React from 'react';

// URL regex pattern - matches URLs with or without protocol
const URL_PATTERN = /(?:https?:\/\/)?(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&//=]*)/gi;

/**
 * Converts plain text containing URLs into React elements with clickable links.
 * Preserves whitespace and line breaks.
 */
export function linkifyText(text: string): React.ReactNode[] {
  if (!text) return [];

  const result: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Reset regex state
  URL_PATTERN.lastIndex = 0;

  while ((match = URL_PATTERN.exec(text)) !== null) {
    const url = match[0];
    const matchIndex = match.index;

    // Add text before the URL
    if (matchIndex > lastIndex) {
      result.push(text.slice(lastIndex, matchIndex));
    }

    // Determine the href - add protocol if missing
    let href = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      href = `https://${url}`;
    }

    // Add the link
    result.push(
      <a
        key={`link-${matchIndex}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sky-600 hover:text-sky-700 hover:underline break-all"
      >
        {url}
      </a>
    );

    lastIndex = matchIndex + url.length;
  }

  // Add any remaining text after the last URL
  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }

  return result.length > 0 ? result : [text];
}
