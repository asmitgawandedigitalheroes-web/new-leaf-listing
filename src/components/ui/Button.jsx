import React from 'react';
import { HiArrowRight } from 'react-icons/hi2';

// ── Button ──────────────────────────────
// variants: primary | green | outline | ghost | danger | white
// sizes: sm | md | lg

const VARIANTS = {
  primary: '',
  green:   '',
  outline: '',
  'outline-white': '',
  ghost:   '',
  danger:  '',
  white:   '',
  secondary: '',
};

const VARIANT_STYLES = {
  primary:        { background: '#D4AF37', color: '#ffffff', fontWeight: 600 },
  gold:           { background: '#D4AF37', color: '#ffffff', fontWeight: 600 },
  green:          { background: '#1F4D3A', color: '#ffffff', fontWeight: 600 },
  outline:        { background: 'transparent', border: '1px solid #1F4D3A', color: '#1F4D3A' },
  'outline-white':{ background: 'transparent', border: '1px solid rgba(255,255,255,0.5)', color: '#ffffff' },
  ghost:          { background: 'transparent', border: 'none', color: '#4B5563' },
  danger:         { background: '#DC2626', color: '#ffffff' },
  white:          { background: '#ffffff', color: '#111111', fontWeight: 700 },
  secondary:      { background: 'transparent', border: '1px solid var(--color-gold)', color: 'var(--color-ivory)' },
};

const VARIANT_HOVER = {
  primary:        { background: '#B8962E' },
  gold:           { background: '#B8962E' },
  green:          { background: '#163829' },
  outline:        { background: '#E8F3EE', color: '#1F4D3A', borderColor: '#1F4D3A' },
  'outline-white':{ borderColor: '#ffffff', background: 'rgba(255,255,255,0.05)' },
  ghost:          { background: '#E8F3EE', color: '#1F4D3A' },
  danger:         { background: '#B91C1C' },
  white:          { background: '#F9FAFB' },
  secondary:      { background: 'rgba(212, 175, 55, 0.1)', color: 'var(--color-gold)' },
};

const SIZES = {
  sm: 'h-10 px-5 text-sm gap-1.5',
  md: 'h-12 px-8 text-sm gap-2',
  lg: 'h-14 px-12 text-base gap-2.5',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  fullWidth = false,
  disabled = false,
  isLoading = false,
  onClick,
  type = 'button',
  as: Tag = 'button',
  href,
  style: extraStyle = {},
  premium = false,
  ...props
}) {
  const base = 'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-300 whitespace-nowrap cursor-pointer disabled:opacity-40 disabled:pointer-events-none gap-2';
  const sizeClass = SIZES[size] || SIZES.md;
  const variantStyle = VARIANT_STYLES[variant] || VARIANT_STYLES.outline;
  const hoverStyle = VARIANT_HOVER[variant] || {};
  const isActuallyDisabled = disabled || isLoading;
  
  // Premium classes for scale and shadow on hover
  const premiumClasses = premium 
    ? 'group hover:scale-[1.03] hover:-translate-y-0.5 active:scale-[0.98] hover:shadow-xl' 
    : '';

  const cls = `${base} ${sizeClass} ${premiumClasses} ${fullWidth ? 'w-full' : ''} ${className}`;

  const handleEnter = (e) => {
    if (isActuallyDisabled) return;
    Object.assign(e.currentTarget.style, hoverStyle);
  };
  const handleLeave = (e) => {
    if (isActuallyDisabled) return;
    // Reset hover styles back to base
    Object.keys(hoverStyle).forEach(k => {
      e.currentTarget.style[k] = variantStyle[k] || '';
    });
  };

  const combinedStyle = { ...variantStyle, ...extraStyle };

  const content = (
    <>
      {isLoading && <span className="spinner" />}
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
      
      {premium && (
        <span className="w-0 opacity-0 transform -translate-x-3 transition-all duration-300 group-hover:w-5 group-hover:opacity-100 group-hover:translate-x-0 group-hover:ml-1.5 flex items-center overflow-hidden">
          <HiArrowRight size={size === 'sm' ? 14 : size === 'lg' ? 20 : 18} />
        </span>
      )}
    </>
  );

  const TagComponent = Tag || 'button';

  if (href) {
    return (
      <a href={href} className={cls} style={combinedStyle} onClick={onClick}
        onMouseEnter={handleEnter} onMouseLeave={handleLeave} {...props}>
        {content}
      </a>
    );
  }

  return (
    <TagComponent type={TagComponent === 'button' ? type : undefined} className={cls} style={combinedStyle} disabled={isActuallyDisabled}
      onClick={onClick} onMouseEnter={handleEnter} onMouseLeave={handleLeave} {...props}>
      {content}
    </TagComponent>
  );
}

