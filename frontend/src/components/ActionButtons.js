/**
 * Reusable View / Edit / Delete action buttons for list tables.
 */
import React from 'react';
import { Link } from 'react-router-dom';

const IconView = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconEdit = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const IconDelete = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

const IconDownload = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

export default function ActionButtons({ basePath, id, onDelete, itemName, onDownloadPdf }) {
  const editPath = `${basePath}/${id}/edit`;

  return (
    <div className="table-actions">
      {typeof onDownloadPdf === 'function' ? (
        <button
          type="button"
          className="btn btn-action btn-action-download"
          title="Download PDF"
          onClick={onDownloadPdf}
        >
          <IconDownload />
          <span>PDF</span>
        </button>
      ) : null}
      <Link to={editPath} className="btn btn-action btn-action-view" title="View details">
        <IconView />
        <span>View</span>
      </Link>
      <Link to={editPath} className="btn btn-action btn-action-edit" title="Edit">
        <IconEdit />
        <span>Edit</span>
      </Link>
      <button
        type="button"
        className="btn btn-action btn-action-delete"
        title={`Delete ${itemName}`}
        onClick={() => {
          if (window.confirm(`Delete this ${itemName}?`)) {
            onDelete();
          }
        }}
      >
        <IconDelete />
        <span>Delete</span>
      </button>
    </div>
  );
}
