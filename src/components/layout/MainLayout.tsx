
import React, { useState } from "react";
import { Sidebar } from "./Sidebar";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar collapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
