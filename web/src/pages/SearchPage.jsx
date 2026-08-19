import { useState } from 'react';
import { useSearchIndex } from '../data/useSearchIndex.js';
import SearchBar from '../components/SearchBar.jsx';
import ArticleList from '../components/ArticleList.jsx';

export default function SearchPage() {
  const { loading, error, search } = useSearchIndex();
  const [query, setQuery] = useState('');

  if (loading) return <p className="status-message">Loading archive…</p>;
  if (error) return <p className="status-message error">Failed to load search index: {error}</p>;

  const results = search(query);

  return (
    <div className="search-page">
      <h1>Search the archive</h1>
      <SearchBar value={query} onChange={setQuery} />
      <p className="result-count">{results.length} result(s)</p>
      <ArticleList articles={results} />
    </div>
  );
}
