import { useEffect, useMemo, useRef, useState } from 'react';

// Generic replacement for native <select> everywhere in the admin (and
// contact form) — a plain <select>'s open listbox is OS-rendered and
// cannot be styled (no control over corners/shadow), and long option
// lists (tags, timezones) are slow to scan without search. Type to
// filter by label, click or Enter to choose.
export default function SearchableSelect({ options, value, onChange, placeholder = 'Select…', ariaLabel }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedLabel = useMemo(() => options.find((o) => o.value === value)?.label ?? '', [options, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  function select(option) {
    onChange(option.value);
    setQuery('');
    setIsOpen(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && filtered[highlightedIndex] !== undefined) select(filtered[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery('');
    }
  }

  return (
    <div className="searchable-select" ref={containerRef}>
      <input
        type="text"
        className="searchable-select-input"
        value={isOpen ? query : selectedLabel}
        placeholder={placeholder}
        readOnly={false}
        onFocus={() => {
          setIsOpen(true);
          setQuery('');
          setHighlightedIndex(Math.max(0, options.findIndex((o) => o.value === value)));
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setHighlightedIndex(0);
          setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
        aria-label={ariaLabel}
      />

      {isOpen && (
        <ul className="searchable-select-dropdown">
          {filtered.map((option, i) => (
            <li
              key={option.value}
              className={`searchable-select-option${i === highlightedIndex ? ' is-highlighted' : ''}${option.value === value ? ' is-selected' : ''}`}
              onMouseEnter={() => setHighlightedIndex(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                select(option);
              }}
            >
              {option.label}
            </li>
          ))}
          {filtered.length === 0 && <li className="searchable-select-empty">No matches</li>}
        </ul>
      )}
    </div>
  );
}
