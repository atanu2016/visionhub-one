
import React from 'react';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { UserMenu } from './UserMenu';

export function HeaderRight() {
  return (
    <div className="flex items-center space-x-2">
      <Button variant="ghost" size="icon" className="relative">
        <Bell className="h-5 w-5" />
        <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500"></span>
      </Button>
      <UserMenu />
    </div>
  );
}
