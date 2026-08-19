function getPageNumbers(current, total) {
  const pages = new Set([1, total, current, current - 1, current + 1]);
  return [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
}

export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pageNumbers = getPageNumbers(page, totalPages);

  return (
    <nav className="pagination" aria-label="Pagination">
      <button onClick={() => onPageChange(page - 1)} disabled={page === 1}>‹</button>

      {pageNumbers.map((num, i) => {
        const prev = pageNumbers[i - 1];
        const gap = prev !== undefined && num - prev > 1;
        return (
          <span key={num} style={{ display: 'contents' }}>
            {gap && <span className="pagination-ellipsis">…</span>}
            <button className={num === page ? 'active' : ''} onClick={() => onPageChange(num)}>
              {num}
            </button>
          </span>
        );
      })}

      <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages}>›</button>
    </nav>
  );
}
