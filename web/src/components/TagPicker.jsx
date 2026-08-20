import { useEffect, useMemo, useRef, useState } from 'react';

const MAX_SUGGESTIONS = 20;

export default function TagPicker({ knownTags, selectedTags, onChange }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const trimmedQuery = query.trim();

  const suggestions = useMemo(() => {
    if (!trimmedQuery) {
      return knownTags.filter((tag) => !selectedTags.includes(tag)).slice(0, MAX_SUGGESTIONS);
    }
    const q = trimmedQuery.toLowerCase();
    return knownTags
      .filter((tag) => !selectedTags.includes(tag) && tag.toLowerCase().includes(q))
      .slice(0, MAX_SUGGESTIONS);
  }, [knownTags, selectedTags, trimmedQuery]);

  const exactMatch = knownTags.some((tag) => tag.toLowerCase() === trimmedQuery.toLowerCase());
  const canAddNew = trimmedQuery.length > 0 && !exactMatch;
  const options = canAddNew ? [...suggestions, { isNew: true, value: trimmedQuery }] : suggestions;

  function selectTag(tag) {
    if (!selectedTags.includes(tag)) onChange([...selectedTags, tag]);
    setQuery('');
    setHighlightedIndex(0);
  }

  function removeTag(tag) {
    onChange(selectedTags.filter((t) => t !== tag));
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const chosen = options[highlightedIndex];
      if (!chosen) return;
      selectTag(chosen.isNew ? chosen.value : chosen);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Backspace' && !query && selectedTags.length > 0) {
      removeTag(selectedTags[selectedTags.length - 1]);
    }
  }

  return (
    <div className="tag-picker" ref={containerRef}>
      {selectedTags.length > 0 && (
        <div className="tag-list">
          {selectedTags.map((tag) => (
            <span key={tag} className="tag-pill">
              {tag}
              <button type="button" className="tag-pill-remove" onClick={() => removeTag(tag)}>×</button>
            </span>
          ))}
        </div>
      )}

      <input
        type="text"
        className="tag-picker-input"
        value={query}
        placeholder="Search or add a tag…"
        onChange={(e) => {
          setQuery(e.target.value);
          setHighlightedIndex(0);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
      />

      {isOpen && options.length > 0 && (
        <ul className="tag-picker-dropdown">
          {options.map((option, i) => {
            const isNew = option.isNew;
            const label = isNew ? option.value : option;
            const key = isNew ? `__new__${option.value}` : option;
            return (
              <li
                key={key}
                className={`tag-picker-option${i === highlightedIndex ? ' is-highlighted' : ''}`}
                onMouseEnter={() => setHighlightedIndex(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectTag(isNew ? option.value : option);
                }}
              >
                {isNew ? <>Add "{label}" as new tag</> : label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
