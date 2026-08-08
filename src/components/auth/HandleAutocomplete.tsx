'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Image from 'next/image';
import { searchHandles, shouldSearchHandles, type HandleSuggestion } from '@/lib/handle-typeahead';

const DEBOUNCE_MS = 200;

interface HandleAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  /** Fired when a suggestion is picked, with the exact handle. */
  onSelect?: (suggestion: HandleSuggestion) => void;
  id?: string;
  name?: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  /** Screen-reader description of the suggestion list. */
  listLabel: string;
}

/**
 * A handle field that suggests accounts as you type.
 *
 * Built as a combobox rather than a plain input with a list underneath, so the
 * keyboard works the way people expect: arrows move, Enter picks, Escape
 * dismisses. The Enter case is the one that matters — inside a form, a bare
 * Enter submits, so choosing a suggestion would otherwise sign the user in with
 * whatever half-typed handle was in the box.
 */
export default function HandleAutocomplete({
  value,
  onChange,
  onSelect,
  id,
  name,
  placeholder,
  className,
  required,
  disabled,
  listLabel,
}: HandleAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<HandleSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const generatedId = useId();
  const inputId = id ?? `handle-${generatedId}`;
  const listId = `${inputId}-suggestions`;

  const containerRef = useRef<HTMLDivElement>(null);
  // The value that came from clicking a suggestion. Without this, selecting an
  // item immediately re-searches for it and reopens the list under the cursor.
  const justSelectedRef = useRef<string | null>(null);

  useEffect(() => {
    if (justSelectedRef.current === value) return;
    justSelectedRef.current = null;

    if (!shouldSearchHandles(value)) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const results = await searchHandles(value, { signal: controller.signal });
      if (controller.signal.aborted) return;
      setSuggestions(results);
      setActiveIndex(-1);
      setIsOpen(results.length > 0);
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      // Abandons the in-flight request, so a slow early keystroke cannot land
      // after a fast later one and repopulate the list with stale matches.
      controller.abort();
    };
  }, [value]);

  // A click anywhere else means the user has moved on.
  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [isOpen]);

  const select = (suggestion: HandleSuggestion) => {
    justSelectedRef.current = suggestion.handle;
    onChange(suggestion.handle);
    onSelect?.(suggestion);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (event.key === 'ArrowDown' && suggestions.length > 0) {
        setIsOpen(true);
        setActiveIndex(0);
        event.preventDefault();
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActiveIndex((index) => (index + 1) % suggestions.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
        break;
      case 'Enter':
        // Only swallow the submit when a suggestion is actually highlighted.
        // Typing a full handle and pressing Enter must still sign in.
        if (activeIndex >= 0) {
          event.preventDefault();
          select(suggestions[activeIndex]);
        }
        break;
      case 'Escape':
        event.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        id={inputId}
        name={name}
        type="text"
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        required={required}
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => setIsOpen(suggestions.length > 0)}
        className={className}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
      />

      {isOpen && suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          aria-label={listLabel}
          className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-neutral-medium bg-white shadow-lg"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.did}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              // Selecting on mousedown keeps focus in the input, so the field
              // does not blur out from under the click.
              onMouseDown={(event) => {
                event.preventDefault();
                select(suggestion);
              }}
              onMouseEnter={() => setActiveIndex(index)}
              className={`flex cursor-pointer items-center gap-3 px-3 py-2 ${
                index === activeIndex ? 'bg-blue-50' : 'bg-white'
              }`}
            >
              {suggestion.avatar ? (
                <Image
                  src={suggestion.avatar}
                  alt=""
                  width={36}
                  height={36}
                  className="h-9 w-9 shrink-0 rounded-full object-cover"
                  unoptimized
                />
              ) : (
                <span className="h-9 w-9 shrink-0 rounded-full bg-neutral-medium" />
              )}
              <span className="min-w-0">
                {suggestion.displayName && (
                  <span className="block truncate text-sm font-medium text-text-primary">
                    {suggestion.displayName}
                  </span>
                )}
                <span className="block truncate text-sm text-text-secondary">@{suggestion.handle}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
