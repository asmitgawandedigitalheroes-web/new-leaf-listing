import { Link } from 'react-router-dom';

const GOLD = 'var(--color-gold)';
const GOLD_DARK = 'var(--color-gold-dark)';
const EMERALD = '#0E3B2E';
const EMERALD_DARK = 'var(--color-primary-dark)';
const BLACK = '#0B0B0B';

export default function Button({ to, children, variant = 'gold', className = '', ...props }) {
  const baseStyles = "inline-flex items-center justify-center gap-2 font-headline font-black uppercase no-underline rounded-sm transition-all";
  
  const variants = {
    gold: {
      background: GOLD,
      color: BLACK,
      boxShadow: '0 4px 14px 0 rgba(201,164,92,0.39)',
      padding: '14px 32px',
      fontSize: '11px',
      letterSpacing: '0.18em',
    },
    ghost: {
      background: 'transparent',
      color: GOLD,
      border: `1.5px solid ${GOLD}`,
      padding: '14px 28px',
      fontSize: '11px',
      letterSpacing: '0.18em',
    },
    primary: {
      background: EMERALD,
      color: '#fff',
      padding: '14px 32px',
      fontSize: '11px',
      letterSpacing: '0.18em',
    }
  };

  const style = variants[variant] || variants.gold;

  const handleMouseEnter = (e) => {
    if (variant === 'gold') e.currentTarget.style.background = '#D4B46A';
    if (variant === 'ghost') e.currentTarget.style.background = EMERALD;
    if (variant === 'primary') e.currentTarget.style.background = '#155c49';
  };

  const handleMouseLeave = (e) => {
    e.currentTarget.style.background = style.background;
  };

  if (to) {
    return (
      <Link 
        to={to} 
        className={`${baseStyles} ${className} shadow-md`}
        style={style}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        {children}
      </Link>
    );
  }

  return (
    <button 
      className={`${baseStyles} ${className} shadow-md`}
      style={style}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
    </button>
  );
}

// Keep aliases for backward compatibility if needed within the refactor
export function GoldBtn(props) { return <Button {...props} variant="gold" />; }
export function GhostBtn(props) { return <Button {...props} variant="ghost" />; }
