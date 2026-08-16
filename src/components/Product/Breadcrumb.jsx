// src/components/Product/Breadcrumb.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { FiChevronRight } from 'react-icons/fi';
import { useBreadcrumbItems } from './useBreadcrumbItems';

export default function Breadcrumb({ categoryName, productName }) {
  const items = useBreadcrumbItems(categoryName, productName);

  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-gray-500">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-center gap-1">
            {idx > 0 && <FiChevronRight className="text-gray-300 shrink-0" aria-hidden />}
            {item.href ? (
              <Link
                to={item.href}
                className="hover:text-primary transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="font-semibold text-gray-800 truncate max-w-[200px]" aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
