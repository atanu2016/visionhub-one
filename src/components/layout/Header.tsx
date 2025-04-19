
import React from 'react';
import { HeaderRight } from './HeaderRight';

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="flex h-16 items-center px-4">
        <div className="flex flex-1 items-center justify-between">
          {title && <h2 className="text-lg font-semibold">{title}</h2>}
          <HeaderRight />
        </div>
      </div>
    </header>
  );
}
