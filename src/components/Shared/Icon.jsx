// src/components/Shared/Icon.jsx
//
// Thin wrapper around the Material Symbols Outlined ligature font (loaded
// in index.html — see design_handoff_advika_auto/README.md's Assets
// section). The glyph name is the ligature text itself, so this component
// is intentionally dumb: it just renders `name` inside a span carrying the
// right font-family/feature-settings and lets Tailwind classes control
// size/color/etc. from the call site, matching how every other icon is
// styled in this codebase (react-icons components take className too).
import React from 'react';

export default function Icon({ name, className = '', size, style, ...rest }) {
  return (
    <span
      className={`material-symbols-outlined leading-none select-none ${className}`}
      style={size ? { fontSize: size, ...style } : style}
      aria-hidden="true"
      translate="no"
      {...rest}
    >
      {name}
    </span>
  );
}
