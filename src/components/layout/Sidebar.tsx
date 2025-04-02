
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  Settings,
  LogOut,
  MessageSquare,
  FileText,
  Video,
  Tag,
  Bell,
  FileQuestion,
  X,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";

type SidebarProps = {
  isOpen: boolean;
  toggleSidebar: () => void;
};

export function Sidebar({ isOpen, toggleSidebar }: SidebarProps) {
  const { logout } = useAuth();
  const isMobile = useIsMobile();

  const mainMenuItems = [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      path: "/dashboard",
    },
    {
      title: "Clients",
      icon: Users,
      path: "/clients",
    },
    {
      title: "Tasks",
      icon: CheckSquare,
      path: "/tasks",
    },
  ];

  const resourcesMenuItems = [
    {
      title: "Messages",
      icon: MessageSquare,
      path: "/admin/chat",
    },
    {
      title: "Resources",
      icon: FileText,
      path: "/admin/resources",
    },
    {
      title: "Videos",
      icon: Video,
      path: "/admin/videos",
    },
    {
      title: "Weekly Products",
      icon: CalendarDays,
      path: "/admin/weekly-products",
    },
    {
      title: "Offers",
      icon: Tag,
      path: "/admin/offers",
    },
    {
      title: "Updates",
      icon: Bell,
      path: "/admin/updates",
    },
    {
      title: "Requests",
      icon: FileQuestion,
      path: "/admin/requests",
    },
  ];

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-20 w-64 transform border-r bg-sidebar transition-transform duration-300 ease-in-out lg:relative",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center justify-between border-b px-6">
          <h2 className="text-lg font-semibold text-sidebar-foreground">
            Admin
            <span className="text-primary">Panel</span>
          </h2>
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="lg:hidden"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
        <div className="flex-1 overflow-auto py-4 px-3">
          <nav className="space-y-1">
            {mainMenuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={isMobile ? toggleSidebar : undefined}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )
                }
              >
                <item.icon className="h-5 w-5" />
                {item.title}
              </NavLink>
            ))}
          </nav>

          <Separator className="my-4" />

          <div className="px-3 mb-2">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60">
              Client Resources
            </h2>
          </div>

          <nav className="space-y-1">
            {resourcesMenuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={isMobile ? toggleSidebar : undefined}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )
                }
              >
                <item.icon className="h-5 w-5" />
                {item.title}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="border-t p-3">
          <NavLink
            to="/settings"
            onClick={isMobile ? toggleSidebar : undefined}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )
            }
          >
            <Settings className="h-5 w-5" />
            Settings
          </NavLink>
          <Separator className="my-2" />
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={logout}
          >
            <LogOut className="mr-3 h-5 w-5" />
            Logout
          </Button>
        </div>
      </div>
    </aside>
  );
}
