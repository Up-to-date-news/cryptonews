export default function SearchBar({ value, onChange, placeholder = 'Search articles…' }) {
  return (
    <input
      type="search"
      className="search-bar"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}
