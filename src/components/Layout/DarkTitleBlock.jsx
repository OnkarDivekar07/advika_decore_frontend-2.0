// src/components/Layout/DarkTitleBlock.jsx
//
// "Every interior page opens with a #0d0d0d block containing a mono
// back-link and an Archivo Black page title whose second word is
// #f97316." — design_handoff_advika_auto/README.md, Shared Patterns.
import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from '@/components/Shared/Icon';

/**
 * @param {{
 *   backTo?: string, backLabel?: string,
 *   titleFirst: string, titleAccent: string, titleClassName?: string,
 *   meta?: React.ReactNode, className?: string, children?: React.ReactNode,
 * }} props
 */
export default function DarkTitleBlock({
  backTo,
  backLabel,
  titleFirst,
  titleAccent,
  titleClassName = 'aa-title-md',
  meta,
  className = '',
  children,
}) {
  const { t } = useTranslation();
  return (
    <div className={`flex flex-col gap-[14px] bg-advika-near-black px-4 pb-[18px] pt-[22px] ${className}`}>
      {backTo && (
        <Link to={backTo} className="aa-label flex items-center gap-1 text-[10.5px] text-advika-grey600">
          <Icon name="arrow_back" size={15} />
          {backLabel || t('productDetail.back', 'Back')}
        </Link>
      )}
      <h1 className={`${titleClassName} text-white`}>
        {titleFirst}{' '}
        {titleAccent && <span className="text-advika-orange">{titleAccent}</span>}
      </h1>
      {meta}
      {children}
    </div>
  );
}
