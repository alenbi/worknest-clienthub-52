
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  CheckSquare,
  Settings,
  LogOut,
  User,
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
import { useClientAuth } from "@/contexts/client-auth-context";
import { Separator } from "@/components/ui/separator";
import { useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

export function ClientSidebar() {
  const { logout, user } = useClientAuth();
  const isMobile = useIsMobile();

  // Fix the issue with client sidebar ID
  useEffect(() => {
    // Ensure the sidebar has the correct ID for the toggle to work
    const sidebar = document.querySelector('aside');
    if (sidebar) {
      sidebar.id = "client-sidebar";
    }
  }, []);

  const menuItems = [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      path: "/client/dashboard",
    },
    {
      title: "Tasks",
      icon: CheckSquare,
      path: "/client/tasks",
    },
    {
      title: "Messages",
      icon: MessageSquare,
      path: "/client/chat",
    },
    {
      title: "Resources",
      icon: FileText,
      path: "/client/resources",
    },
    {
      title: "Videos",
      icon: Video,
      path: "/client/videos",
    },
    {
      title: "Weekly Products",
      icon: CalendarDays,
      path: "/client/weekly-products",
    },
    {
      title: "Offers",
      icon: Tag,
      path: "/client/offers",
    },
    {
      title: "Updates",
      icon: Bell,
      path: "/client/updates",
    },
    {
      title: "Requests",
      icon: FileQuestion,
      path: "/client/requests",
    },
  ];

  const bottomMenuItems = [
    {
      title: "Profile",
      icon: User,
      path: "/client/profile",
    },
  ];

  // Close sidebar when clicking a link on mobile
  const closeSidebar = () => {
    if (isMobile) {
      const sidebar = document.getElementById("client-sidebar");
      if (sidebar) {
        sidebar.classList.add("-translate-x-full");
      }
    }
  };

  return (
    <aside
      id="client-sidebar"
      className="fixed inset-y-0 left-0 z-20 w-64 transform border-r bg-sidebar transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:w-64 -translate-x-full"
    >
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center justify-between border-b px-6">
          <h2 className="text-lg font-semibold text-sidebar-foreground">
            Client
            <span className="text-primary">Portal</span>
          </h2>
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={closeSidebar}
              className="lg:hidden"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
        
        {user && (
          <div className="border-b px-6 py-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                {user.name ? 
                  user.name.split(' ').map(n => n[0]).join('').toUpperCase() :
                  user.email?.charAt(0).toUpperCase()}
              </div>
              <div className="space-y-1 overflow-hidden">
                <p className="text-sm font-medium leading-none truncate">
                  {user.name || user.email}
                </p>
                {user.company && (
                  <p className="text-xs text-muted-foreground truncate">
                    {user.company}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        
        <div className="flex-1 overflow-auto py-4 px-3">
          <nav className="space-y-1">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={closeSidebar}
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
                onClick={closeSidebar}
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
  );
}
