import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell, MessageSquare, User, Menu, LogOut } from "lucide-react";
import { useClientAuth } from "@/contexts/client-auth-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { ClientThemeToggle } from "./ClientThemeToggle";
import { useNavigate } from "react-router-dom";

export function ClientHeader() {
  const { user, logout } = useClientAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [unreadMessages, setUnreadMessages] = useState(0);

  const toggleSidebar = () => {
    const sidebar = document.getElementById("client-sidebar");
    sidebar?.classList.toggle("-translate-x-full");
  };

  const getInitials = (name: string = "") => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <header className="flex h-16 items-center border-b bg-background px-4">
      <Button
        onClick={toggleSidebar}
        variant="ghost"
        size="icon"
        className="mr-2 lg:hidden"
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle menu</span>
      </Button>
      
      <div className="hidden md:block">
        <h1 className="text-xl font-semibold">Client Portal</h1>
      </div>
      
      <div className="ml-auto flex items-center space-x-2">
        <ClientThemeToggle />
        
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate("/client/chat")}
        >
          <div className="relative">
            <MessageSquare className="h-5 w-5" />
            {unreadMessages > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
                {unreadMessages}
              </span>
            )}
          </div>
          <span className="sr-only">Messages</span>
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {user?.name ? getInitials(user.name) : <User className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/client/profile")}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => logout()}>
              <LogOut className="mr-2 h-4 w-4" />
              Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
