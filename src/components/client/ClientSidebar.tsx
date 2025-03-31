
import { NavLink } from "react-router-dom";
import {
  BarChart3,
  CheckSquare,
  MessageSquare,
  Video,
  FileText,
  Tag,
  LogOut,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useClientAuth } from "@/contexts/client-auth-context";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";

export function ClientSidebar() {
  const { logout, user } = useClientAuth();
  const isMobile = useIsMobile();

  const menuItems = [
    {
      title: "Dashboard",
      icon: BarChart3,
      path: "/client/dashboard",
    },
    {
      title: "My Tasks",
      icon: CheckSquare,
      path: "/client/tasks",
    },
    {
      title: "Chat Support",
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
      title: "Offers",
      icon: Tag,
      path: "/client/offers",
    },
    {
      title: "Profile",
      icon: User,
      path: "/client/profile",
    },
  ];

  return (
    <aside
      id="client-sidebar"
      className={cn(
        "bg-sidebar fixed inset-y-0 left-0 z-20 w-64 transform border-r transition-transform duration-300 ease-in-out",
        isMobile ? "-translate-x-full" : "translate-x-0",
        "lg:translate-x-0 lg:static lg:w-64"
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center border-b px-6">
          <h2 className="text-lg font-semibold text-sidebar-foreground">
            {user?.company || "Client"} 
            <span className="text-primary">.</span>
          </h2>
        </div>
        <div className="flex-1 overflow-auto py-4 px-3">
          <nav className="space-y-1">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
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
};
