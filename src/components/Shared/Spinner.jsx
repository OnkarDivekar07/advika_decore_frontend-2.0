import React from 'react';

/**
 * Spinner – matches brand primary colour.
 * @param {{ size?: number, color?: string }} props
 */
const Spinner = ({ size = 40, color = 'var(--clr-primary)' }) => (
  <div className="flex justify-center items-center" role="status" aria-label="Loading">
    <div
      style={{
        width: size,
        height: size,
        border: `3px solid ${color}33`,
        borderTopColor: color,
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }}
    />
  </div>
);

export default Spinner;
