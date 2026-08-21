import { useEffect, useMemo, useRef, useState } from 'react';

// A searchable single-select for tag filters — plain <select> can't be
// styled once its listbox is open (native popup, no CSS control over its
// corners/shadow), and with hundreds of tags a flat scroll list is slow
// to use. This is a small custom combobox: type to filter, click to pick.
export default function TagFilterSelect({ tags, value, onChange, placeholder = 'All tags' }) {
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tags;
    return tags.filter((tag) => tag.toLowerCase().includes(q));
  }, [tags, query]);

  function select(tag) {
    onChange(tag);
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
    <div className="tag-filter-select" ref={containerRef}>
      <input
        type="text"
        className="tag-filter-input"
        value={isOpen ? query : value || ''}
        placeholder={placeholder}
        onFocus={() => {
          setIsOpen(true);
          setQuery('');
          setHighlightedIndex(0);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setHighlightedIndex(0);
          setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
        aria-label="Filter by tag"
      />

      {isOpen && (
        <ul className="tag-filter-dropdown">
          <li
            className={`tag-filter-option${value === '' ? ' is-selected' : ''}`}
            onMouseDown={(e) => {
              e.preventDefault();
              select('');
            }}
          >
            All tags
          </li>
          {filtered.map((tag, i) => (
            <li
              key={tag}
              className={`tag-filter-option${i === highlightedIndex ? ' is-highlighted' : ''}${tag === value ? ' is-selected' : ''}`}
              onMouseEnter={() => setHighlightedIndex(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                select(tag);
              }}
            >
              {tag}
            </li>
          ))}
          {filtered.length === 0 && <li className="tag-filter-empty">No matching tags</li>}
        </ul>
      )}
    </div>
  );
}
