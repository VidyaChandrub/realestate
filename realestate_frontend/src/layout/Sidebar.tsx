import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Building2, Briefcase, FileText,
  Calendar, Megaphone, Database, BarChart3, Bell, ChevronLeft,
  ChevronRight, Compass, HelpCircle, SearchCode, Settings, Home,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { menuApi } from '@/api/services';
import { toast } from 'sonner';
import type { MenuApiResponse } from '@/types';

interface NavChildItem {
  to: string;
  label: string;
}

interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
  children?: NavChildItem[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

// Icon mapper - maps string icon names to lucide-react components
const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  FileText,
  Calendar,
  Megaphone,
  Database,
  BarChart3,
  Bell,
  HelpCircle,
  SearchCode,
  Settings,
};

// Get icon by name with fallback
const getIcon = (iconName?: string): LucideIcon => {
  if (!iconName || !(iconName in iconMap)) {
    return Compass; 
  }
  return iconMap[iconName];
};

// Transform API response to internal format
const transformMenuApiResponse = (apiResponse: MenuApiResponse): NavGroup[] => {
  return apiResponse.groups.map((group) => ({
    label: group.label,
    items: group.items.map((item) => ({
      to: item.to,
      icon: getIcon(item.icon),
      label: item.label,
      children: item.children?.map((child) => ({
        to: child.to,
        label: child.label,
      })),
    })),
  }));
};

const withOrganisationModule = (groups: NavGroup[]): NavGroup[] => {
  if (groups.some((group) => group.items.some((item) => item.to.startsWith('/organisation')))) {
    return groups;
  }

  const moduleItem: NavItem = {
    to: '/organisation',
    icon: Building2,
    label: 'Organisation'
  };

  const managementGroupIndex = groups.findIndex((group) => group.label.toLowerCase().includes('manage'));
  if (managementGroupIndex >= 0) {
    return groups.map((group, index) =>
      index === managementGroupIndex
        ? { ...group, items: [moduleItem, ...group.items] }
        : group
    );
  }

  return [{ label: 'Management', items: [moduleItem] }, ...groups];
};

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [navGroups, setNavGroups] = useState<NavGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        setIsLoading(true);
        const menuResponse = await menuApi.getMenu();
        if (menuResponse && menuResponse.groups && Array.isArray(menuResponse.groups)) {
          const transformedMenu = transformMenuApiResponse(menuResponse);
          setNavGroups(withOrganisationModule(transformedMenu));
        }
      } catch (error) {
        console.error('Failed to fetch menu:', error);
        setNavGroups(withOrganisationModule([]));
        toast.error('Failed to load menu.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMenu();
  }, []);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Home className="h-5 w-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="text-sm font-semibold text-sidebar-accent-foreground truncate">
            RealEstate
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isEmployerScoped = location.pathname.startsWith('/employers/');
                const isActive = item.to === '/' 
                  ? location.pathname === '/' 
                  : isEmployerScoped && item.to !== '/employers'
                    ? false
                    : location.pathname.startsWith(item.to);
                return (
                  <li key={item.to}>
                    {item.children ? (
                      <div className="space-y-1">
                        <NavLink
                          to={item.children[0].to}
                          className={cn(
                            'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                            isActive
                              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                              : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                          )}
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          {!collapsed && <span className="truncate">{item.label}</span>}
                        </NavLink>
                        {!collapsed && (
                          <div className="ml-6 space-y-0.5 border-l border-sidebar-border/80 pl-3">
                            {item.children.map((child) => {
                              const childActive = location.pathname.startsWith(child.to);
                              return (
                                <NavLink
                                  key={child.to}
                                  to={child.to}
                                  className={cn(
                                    'block rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                                    childActive
                                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                      : 'text-sidebar-muted hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground'
                                  )}
                                >
                                  {child.label}
                                </NavLink>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      <NavLink
                        to={item.to}
                        className={cn(
                          'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                        )}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </NavLink>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex h-10 items-center justify-center border-t border-sidebar-border text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </aside>
  );
}
