
import logoImg from '../../assets/logo.png';

/* ── New Leaf Listings — Brand Logo ─────────────────────────
   Renders using the new brand image:
   • light  → original colors (gold/black)
   • dark   → inverted/adjusted for dark backgrounds
   Sizes: sm | md | lg
──────────────────────────────────────────────────────────── */

const SIZES = {
  sm: { h: 58, w: 'auto' },
  md: { h: 72, w: 'auto' },
  lg: { h: 96, w: 'auto' },
};

export default function NLVLogo({ mode = 'dark', size = 'md', className = '' }) {
  const s = SIZES[size] || SIZES.md;

  // Base styles for the logo image
  const imgStyle = {
    height: s.h,
    width: s.w,
    display: 'block',
    objectFit: 'contain',
    transition: 'all 0.2s ease',
  };

  // Treatment for dark background (e.g., in the footer)
  // Since the logo has black text and a white background, 
  // we use a filter to make it look good on dark surfaces.
  if (mode === 'dark') {
    Object.assign(imgStyle, {
      // Invert makes black white and white black, but kills gold.
      // Hue-rotate(180) brings the gold hue back from the inverted state.
      filter: 'invert(1) hue-rotate(180deg) brightness(1.4) contrast(1.1)',
      opacity: 1,
    });
  } else {
    // For light backgrounds, we can use mix-blend-mode to "remove" the white bg if it's there
    Object.assign(imgStyle, {
      mixBlendMode: 'multiply',
    });
  }

  return (
    <div className={`inline-flex items-center select-none ${className}`}>
      <img
        src={logoImg}
        alt="New Leaf Listings Logo"
        style={imgStyle}
        draggable={false}
      />
    </div>
  );
}
