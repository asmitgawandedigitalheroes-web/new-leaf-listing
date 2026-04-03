import React, { useState, useMemo, useRef, useEffect } from 'react';
import { HiMagnifyingGlass, HiXMark, HiChevronDown } from 'react-icons/hi2';

/**
 * SearchableSelect - A premium custom dropdown with search capabilities.
 * 
 * @param {Array} options - [{ value, label, sublabel }]
 * @param {String} value - Currently selected value
 * @param {Function} onChange - Callback when an option is selected
 * @param {String} placeholder - Input placeholder
 * @param {String} emptyLabel - Label when value is "" or null
 */
export default function SearchableSelect({
  options = [],
  value = '',
  onChange,
  placeholder = 'Search...',
  emptyLabel = '— Select —',
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [dropUp, setDropUp] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Sync search with selected value label when NOT searching
  const selectedOption = useMemo(() => options.find(o => String(o.value) === String(value)), [options, value]);
  
  const displayLabel = useMemo(() => {
    if (selectedOption) return selectedOption.label;
    return value === '' ? emptyLabel : '...';
  }, [selectedOption, value, emptyLabel]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return options;
    return options.filter(o => 
      (o.label || '').toLowerCase().includes(q) || 
      (o.sublabel || '').toLowerCase().includes(q)
    );
  }, [options, search]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    
    const handleScroll = () => {
      if (isOpen) updatePosition();
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  const updatePosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownHeight = 300; // Expected max height
      setDropUp(spaceBelow < dropdownHeight && rect.top > dropdownHeight);
    }
  };

  useEffect(() => {
    if (isOpen) updatePosition();
  }, [isOpen]);

  const handleSelect = (v) => {
    onChange(v);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setSearch('');
  };

  const P = '#D4AF37'; // Gold
  const S = '#1F4D3A'; // Green
  const BORDER = '#E5E7EB';

  return (
    <div 
      className={`relative ${className}`} 
      ref={containerRef}
      style={{ minWidth: 200 }}
    >
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg flex items-center justify-between cursor-pointer bg-white group transition-all"
        style={{ 
          borderColor: isOpen ? P : BORDER,
          boxShadow: isOpen ? `0 0 0 1px ${P}` : 'none'
        }}
      >
        <div className="flex flex-col truncate">
          {isOpen ? (
            <input 
              autoFocus
              className="w-full bg-transparent outline-none text-gray-900 placeholder-gray-400"
              placeholder={placeholder}
              value={search}
              onChange={e => setSearch(e.target.value)}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <span className={!selectedOption ? 'text-gray-400' : 'text-gray-900 font-medium'}>
              {displayLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {(value && !isOpen) && (
            <HiXMark 
              className="text-gray-400 hover:text-red-500 transition-colors" 
              onClick={handleClear}
              size={16}
            />
          )}
          {isOpen ? (
            <HiMagnifyingGlass size={16} style={{ color: P }} />
          ) : (
            <HiChevronDown size={14} className="text-gray-400 group-hover:text-gray-600" />
          )}
        </div>
      </div>

      {isOpen && (
        <div 
          className={`absolute z-[9999] left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-${dropUp ? 'bottom' : 'top'}-1 duration-200`}
          style={{ 
            maxHeight: 280, 
            overflowY: 'auto',
            bottom: dropUp ? 'calc(100% + 4px)' : 'auto',
            top: dropUp ? 'auto' : 'calc(100% + 4px)',
            boxShadow: dropUp ? '0 -20px 40px rgba(0,0,0,0.15)' : '0 20px 40px rgba(0,0,0,0.15)'
          }}
        >
          {filtered.length > 0 ? (
            <div className="py-1">
              {/* Optional: Add "Unassigned" option if not in options */}
              {options.every(o => o.value !== '') && (
                 <div 
                  onClick={() => handleSelect('')}
                  className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-widest cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                >
                  {emptyLabel}
                  {value === '' && <span style={{ color: P }}>✓</span>}
                </div>
              )}
              
              {filtered.map((opt) => (
                <div 
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  className="px-4 py-2.5 cursor-pointer hover:bg-gray-50 flex items-center justify-between transition-colors border-l-4 border-transparent"
                  style={{ 
                    borderLeftColor: String(value) === String(opt.value) ? P : 'transparent',
                    background: String(value) === String(opt.value) ? `${P}08` : 'transparent'
                  }}
                >
                  <div className="flex flex-col">
                    <span className={`text-sm ${String(value) === String(opt.value) ? 'font-bold' : 'font-medium'} text-gray-900`}>
                      {opt.label}
                    </span>
                    {opt.sublabel && (
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                        {opt.sublabel}
                      </span>
                    )}
                  </div>
                  {String(value) === String(opt.value) && (
                    <HiMagnifyingGlass size={14} style={{ color: P, opacity: 0.5 }} className="hidden" /> // Spacer
                  )}
                  {String(value) === String(opt.value) && <span style={{ color: P, fontSize: 18 }}>•</span>}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <span className="text-2xl mb-1 block">🔍</span>
              <p className="text-xs text-gray-400 font-medium whitespace-nowrap">No results for "{search}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
