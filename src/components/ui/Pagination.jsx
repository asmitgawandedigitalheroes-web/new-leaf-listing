import React from 'react';
import Button from './Button';

/**
 * Reusable Pagination component
 * 
 * Props:
 *  currentPage - current active page (1-indexed)
 *  totalPages  - total number of pages
 *  onPageChange - callback when a page is selected
 *  totalItems  - total number of items
 *  pageSize    - items per page
 */
export default function Pagination({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  totalItems, 
  pageSize,
  className = ''
}) {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Simple page range logic (shows max 7 pages)
  const getPageNumbers = () => {
    const pages = [];
    let start = Math.max(1, currentPage - 3);
    let end = Math.min(totalPages, start + 6);
    
    if (end - start < 6) {
      start = Math.max(1, end - 6);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-4 ${className}`} style={{ borderTop: '1px solid #F3F4F6' }}>
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
        Showing {startItem}–{endItem} of {totalItems}
      </span>
      <div className="flex flex-wrap gap-1.5">
        <Button 
          variant="outline" 
          size="sm" 
          disabled={currentPage === 1} 
          onClick={() => onPageChange(currentPage - 1)}
          className="!px-3"
        >
          Prev
        </Button>
        
        {getPageNumbers().map(p => (
          <button 
            key={p} 
            onClick={() => onPageChange(p)}
            className="w-8 h-8 rounded-lg text-xs font-bold transition-all"
            style={{ 
              background: p === currentPage ? '#D4AF37' : 'transparent', 
              color: p === currentPage ? '#fff' : '#6B7280',
              border: p === currentPage ? 'none' : '1px solid transparent'
            }}
          >
            {p}
          </button>
        ))}
        
        <Button 
          variant="outline" 
          size="sm" 
          disabled={currentPage === totalPages} 
          onClick={() => onPageChange(currentPage + 1)}
          className="!px-3"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
