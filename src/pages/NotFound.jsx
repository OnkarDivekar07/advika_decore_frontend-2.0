// src/pages/NotFound.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar/Navbar';

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="flex flex-col items-center justify-center min-h-[60vh] gap-5 text-center px-4">
        <p className="font-display text-8xl font-bold text-primary">404</p>
        <h1 className="text-2xl font-bold text-gray-800">Page not found</h1>
        <p className="text-gray-500">The page you're looking for doesn't exist or was moved.</p>
        <Link to="/" className="btn btn-primary px-8">Go Home</Link>
      </main>
    </>
  );
}
