/**
 * Previous / next / page number controls for paginated API lists.
 */
import React from 'react';

export default function ListPagination({ page, totalPages, totalItems, pageSize, onPageChange }) {
  if (!totalItems || totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  const pages = [];
  const maxButtons = 5;
  let from = Math.max(1, page - Math.floor(maxButtons / 2));
  let to = Math.min(totalPages, from + maxButtons - 1);
  from = Math.max(1, to - maxButtons + 1);
  for (let p = from; p <= to; p++) pages.push(p);

  return (
    <nav className="list-pagination" aria-label="Pagination">
      <p className="list-pagination-summary">
        Showing {start}–{end} of {totalItems}
      </p>
      <div className="list-pagination-controls">
        <button
          type="button"
          className="btn btn-secondary"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <div className="list-pagination-pages" role="group" aria-label="Page numbers">
          {from > 1 && (
            <>
              <button type="button" className="list-pagination-page" onClick={() => onPageChange(1)}>
                1
              </button>
              {from > 2 && <span className="list-pagination-ellipsis" aria-hidden>…</span>}
            </>
          )}
          {pages.map((p) => (
            <button
              key={p}
              type="button"
              className={`list-pagination-page${p === page ? ' list-pagination-page--active' : ''}`}
              aria-current={p === page ? 'page' : undefined}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          ))}
          {to < totalPages && (
            <>
              {to < totalPages - 1 && <span className="list-pagination-ellipsis" aria-hidden>…</span>}
              <button
                type="button"
                className="list-pagination-page"
                onClick={() => onPageChange(totalPages)}
              >
                {totalPages}
              </button>
            </>
          )}
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </nav>
  );
}
