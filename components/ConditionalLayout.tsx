'use client';

import React from 'react';

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}