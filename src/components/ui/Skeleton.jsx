import React from 'react';

/**
 * Reusable Skeleton loader for data-fetching states.
 * @param {string} className - Optional tailwind classes.
 * @param {string} variant - 'text' | 'rect' | 'circle'
 * @param {string} width - e.g., '100%', '200px'
 * @param {string} height - e.g., '1em', '150px'
 * @param {object} style - Custom inline styles.
 */
export default function Skeleton({
  className = '',
  variant = 'rect',
  width,
  height,
  style = {},
}) {
  const isCircle = variant === 'circle';
  const isText = variant === 'text';

  const baseStyle = {
    width: width || (isText ? '100%' : 'auto'),
    height: height || (isText ? '0.8em' : 'auto'),
    ...style,
  };

  const classes = [
    'skeleton',
    isCircle ? 'rounded-full' : 'rounded-lg',
    isText ? 'skeleton-text mb-2' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} style={baseStyle} />
  );
}
