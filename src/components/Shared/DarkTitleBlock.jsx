// src/components/Shared/DarkTitleBlock.jsx
//
// "Dark title block" shared pattern (design_handoff_advika_auto/README.md
// "Shared Patterns"): every interior page opens with a #0d0d0d block
// containing a mono back-link and an Archivo Black page title whose second
// word is orange. Exact title composition, sizing (it varies per screen,
// and again between English and Hindi/Marathi per the type-metrics table)
// and any meta line underneath are left to the caller via `children` —
// only the back-link + dark background wrapper is common to all of them.
//
// Convention for the title itself: render an <h1> as a child with the
// accent word wrapped in <span className="text-advika-orange">.
import React from 'react';
import { Link } from 'react-router-dom';
import MaterialIcon from '@/components/Shared/MaterialIcon';

export default function DarkTitleBlock({
  backTo,
  backLabel,
  onBack,
  className = '',
  padClassName = 'px-4 pt-[22px] pb-[18px]',
  children,
}) {
  const backContent = (
    <>
      <MaterialIcon name="arrow_back" size={15} color="#a3a3a3" />
      <span>{backLabel}</span>
    </>
  );
  const backClassName =
    'inline-flex items-center gap-1 font-plex-mono text-[10.5px] text-advika-grey600 no-underline bg-transparent border-0 p-0 w-fit';

  return (
    <div className={`bg-advika-near-black flex flex-col gap-3.5 ${padClassName} ${className}`}>
      {onBack ? (
        <button type="button" onClick={onBack} className={backClassName}>
          {backContent}
        </button>
      ) : (
        <Link to={backTo || '/'} className={backClassName}>
          {backContent}
        </Link>
      )}
      {children}
    </div>
  );
}
