// src/pages/Checkout/CheckoutStepper.jsx
import React from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiCheck } from 'react-icons/fi';

const STEPS = [
  { path: '/checkout', label: 'address', fallback: 'Address' },
  { path: '/checkout/review', label: 'review', fallback: 'Review' },
  { path: '/checkout/payment', label: 'payment', fallback: 'Payment' },
];

export default function CheckoutStepper() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const activeIndex = pathname.startsWith('/checkout/payment')
    ? 2
    : pathname.startsWith('/checkout/review')
      ? 1
      : 0;

  return (
    <ol className="flex items-center gap-3 mb-8" aria-label={t('checkout.stepsLabel', 'Checkout steps')}>
      {STEPS.map((step, index) => {
        const isDone = index < activeIndex;
        const isActive = index === activeIndex;
        return (
          <li key={step.path} className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  isActive
                    ? 'bg-[var(--clr-primary)] text-[#111]'
                    : isDone
                      ? 'bg-[var(--clr-ink)] text-white'
                      : 'bg-gray-100 text-gray-400'
                }`}
              >
                {isDone ? <FiCheck className="w-4 h-4" /> : index + 1}
              </span>
              <span
                className={`text-sm font-medium ${isActive ? 'text-gray-900' : 'text-gray-400'}`}
              >
                {t(`checkout.step.${step.label}`, step.fallback)}
              </span>
            </div>
            {index < STEPS.length - 1 && <span className="w-8 h-px bg-gray-200" />}
          </li>
        );
      })}
    </ol>
  );
}
