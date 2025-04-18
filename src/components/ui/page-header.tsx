
import React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({ 
  title, 
  description, 
  children,
  className 
}: PageHeaderProps) {
  return (
    <div className={cn("pb-4 border-b border-border/30 mb-6 animate-fade-in", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight gradient-text">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-1 animate-fade-in" style={{animationDelay: '0.1s'}}>{description}</p>
          )}
        </div>
        {children && <div className="flex items-center gap-2 animate-fade-in" style={{animationDelay: '0.2s'}}>{children}</div>}
      </div>
    </div>
  );
}
