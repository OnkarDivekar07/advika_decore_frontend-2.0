// src/components/Shared/ErrorBoundary.jsx
import React from 'react';
import { handleError } from '@/utils/errorHandler';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    handleError(error, 'An unexpected error occurred.');
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
          <h2 className="font-display text-2xl font-bold text-gray-800">Something went wrong</h2>
          <p className="text-gray-500 text-sm">Please reload the page to continue.</p>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-primary"
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
