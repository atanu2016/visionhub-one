
import React from "react";
import { NavLink } from "react-router-dom";
import { 
  Camera, 
  Grid, 
  List, 
  Settings, 
  AlertCircle, 
  Database, 
  ChevronLeft, 
  ChevronRight,
  Home
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  collapsed: boolean;
  toggleSidebar: () => void;
}

export function Sidebar({ collapsed, toggleSidebar }: SidebarProps) {
  return (
    <div 
      className={cn(
        "border-r border-sidebar-border bg-sidebar h-full flex flex-col transition-all duration-300 ease-in-out relative z-10",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="py-6 px-4 flex items-center justify-between border-b border-sidebar-border/70">
        {!collapsed && (
          <h1 className="font-bold text-xl tracking-tight text-white flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-sentinel-purple/20 backdrop-blur-sm">
              <Camera className="h-5 w-5 text-[hsl(var(--sentinel-purple))]" />
            </div>
            <span className="gradient-text">VisionHub</span>
          </h1>
        )}
        {collapsed && (
          <div className="p-1.5 rounded-md bg-sentinel-purple/20 backdrop-blur-sm mx-auto">
            <Camera className="h-5 w-5 text-[hsl(var(--sentinel-purple))]" />
          </div>
        )}
        <button 
          onClick={toggleSidebar}
          className="p-1.5 rounded-md hover:bg-sidebar-accent focus:outline-none focus:ring-1 focus:ring-[hsl(var(--sentinel-purple))] transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 overflow-y-auto">
        <ul className="space-y-2 px-3">
          <NavItem to="/" icon={Home} label="Dashboard" collapsed={collapsed} />
          <NavItem to="/cameras/grid" icon={Grid} label="Camera Grid" collapsed={collapsed} />
          <NavItem to="/cameras/list" icon={List} label="Camera List" collapsed={collapsed} />
          <NavItem to="/recordings" icon={Database} label="Recordings" collapsed={collapsed} />
          <NavItem to="/events" icon={AlertCircle} label="Events" collapsed={collapsed} />
          <NavItem to="/settings" icon={Settings} label="Settings" collapsed={collapsed} />
        </ul>
      </nav>

      {/* Footer */}
      <div className="mt-auto p-4 border-t border-sidebar-border/70">
        {!collapsed && (
          <div className="text-xs text-muted-foreground">
            <p>VisionHub One Sentinel</p>
            <p>v1.0.0</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  collapsed: boolean;
}

function NavItem({ to, icon: Icon, label, collapsed }: NavItemProps) {
  return (
    <li className="animate-slide-in">
      <NavLink 
        to={to}
        className={({ isActive }) => 
          cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
            isActive 
              ? "bg-[hsl(var(--sentinel-purple))/15] text-white backdrop-blur-sm border border-[hsl(var(--sentinel-purple))]/30" 
              : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
          )
        }
      >
        <div className="flex items-center justify-center">
          <Icon className="h-5 w-5" />
        </div>
        {!collapsed && <span className="text-sm">{label}</span>}
      </NavLink>
    </li>
  );
}
