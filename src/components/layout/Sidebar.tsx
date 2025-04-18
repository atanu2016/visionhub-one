
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
        "border-r border-border bg-sidebar h-full flex flex-col transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="py-6 px-4 flex items-center justify-between border-b border-border">
        {!collapsed && (
          <h1 className="font-bold text-xl tracking-tight text-white flex items-center gap-2">
            <Camera className="h-6 w-6 text-sentinel-purple" />
            <span>VisionHub</span>
          </h1>
        )}
        {collapsed && (
          <Camera className="h-6 w-6 text-sentinel-purple mx-auto" />
        )}
        <button 
          onClick={toggleSidebar}
          className="p-1 rounded-md hover:bg-sidebar-accent focus:outline-none focus:ring-1 focus:ring-sentinel-purple"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          <NavItem to="/" icon={Home} label="Dashboard" collapsed={collapsed} />
          <NavItem to="/cameras/grid" icon={Grid} label="Camera Grid" collapsed={collapsed} />
          <NavItem to="/cameras/list" icon={List} label="Camera List" collapsed={collapsed} />
          <NavItem to="/recordings" icon={Database} label="Recordings" collapsed={collapsed} />
          <NavItem to="/events" icon={AlertCircle} label="Events" collapsed={collapsed} />
          <NavItem to="/settings" icon={Settings} label="Settings" collapsed={collapsed} />
        </ul>
      </nav>

      {/* Footer */}
      <div className="mt-auto p-4 border-t border-border">
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
    <li>
      <NavLink 
        to={to}
        className={({ isActive }) => 
          cn(
            "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
            isActive 
              ? "bg-sentinel-purple text-white" 
              : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
          )
        }
      >
        <Icon className="h-5 w-5" />
        {!collapsed && <span>{label}</span>}
      </NavLink>
    </li>
  );
}
