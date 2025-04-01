
import { NavLink } from "react-router-dom";
import {
  BarChart3,
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";

export function Sidebar({ isOpen, toggleSidebar }) {
  const { logout } = useAuth();
  const isMobile = useIsMobile();

  const menuItems = [
    {
      title: "Dashboard",
      icon: BarChart3,
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

  const bottomMenuItems = [
    {
      title: "Settings",
      icon: Settings,
      path: "/settings",
    },
  ];

  // Mobile sidebar backdrop
  const backdrop = isMobile && isOpen ? (
    <div 
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-10"
      onClick={toggleSidebar}
    />
  ) : null;

  return (
    <>
      {backdrop}
      <aside
        id="sidebar"
        className={cn(
          "bg-sidebar fixed inset-y-0 left-0 z-20 w-64 border-r transition-transform duration-300 ease-in-out",
          isMobile ? (isOpen ? "translate-x-0" : "-translate-x-full") : "translate-x-0 relative"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between border-b px-6">
            <h2 className="text-lg font-semibold text-sidebar-foreground">
              Digitalshopi
              <span className="text-primary">.</span>
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
              {menuItems.map((item) => (
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
            <div className="space-y-1">
              {bottomMenuItems.map((item) => (
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
        </div>
      </aside>
    </>
  );
}
