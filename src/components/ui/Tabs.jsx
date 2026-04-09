import { useState } from 'react';

export default function Tabs({ tabs, defaultTab, onChange, className = '' }) {
  const [active, setActive] = useState(defaultTab || tabs[0]?.key);

  const handleClick = (key) => {
    setActive(key);
    onChange?.(key);
  };

  return (
    <div className={`tabs-strip flex border-b border-gray-200 ${className}`}>
      {tabs.map(tab => (
        <button
          key={tab.key}
          className={`tab-btn ${active === tab.key ? 'active' : ''}`}
          onClick={() => handleClick(tab.key)}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="tab-count ml-1.5 bg-gray-200 text-gray-600 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
