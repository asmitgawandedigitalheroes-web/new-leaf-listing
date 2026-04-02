import { useEffect } from 'react';

const BASE_TITLE = 'NLV Listings';

/**
 * Sets the browser tab title to `<pageTitle> | NLV Listings`.
 * Falls back to just "NLV Listings" if no title is provided.
 *
 * @param {string} [title] - The page-specific title segment.
 */
export function useDocumentTitle(title) {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} | ${BASE_TITLE}` : BASE_TITLE;
    return () => {
      document.title = prev;
    };
  }, [title]);
}

export default useDocumentTitle;
