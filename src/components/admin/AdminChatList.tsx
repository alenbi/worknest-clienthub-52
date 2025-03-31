
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ClientMessage } from "@/lib/models";

interface ClientWithChat {
  id: string;
  name: string;
  company: string;
  avatar?: string;
  unread_count: number;
  last_message?: string;
  last_message_date?: string;
}

export function AdminChatList() {
  const [clients, setClients] = useState<ClientWithChat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchClientsWithChatInfo = async () => {
      try {
        setIsLoading(true);
        
        // Get all clients
        const { data: clientsData, error: clientsError } = await supabase
          .from("clients")
          .select("*");
        
        if (clientsError) {
          console.error("Error fetching clients:", clientsError);
          throw clientsError;
        }
        
        // For each client, get the most recent message and unread count
        const clientsWithChatInfo = await Promise.all(clientsData.map(async (client) => {
          // Get most recent message
          const { data: messagesData, error: messagesError } = await supabase
            .from("client_messages")
            .select("*")
            .eq("client_id", client.id)
            .order("created_at", { ascending: false })
            .limit(1);
          
          if (messagesError) {
            console.error("Error fetching messages for client:", client.id, messagesError);
            throw messagesError;
          }
          
          // Count unread messages from client - ensure we avoid ambiguous column references
          const { count, error: countError } = await supabase
            .from("client_messages")
            .select("*", { count: "exact", head: true })
            .eq("client_id", client.id)
            .eq("is_from_client", true)
            .eq("is_read", false);
          
          if (countError) {
            console.error("Error counting unread messages:", countError);
            throw countError;
          }
          
          const lastMessage = messagesData?.[0];
          
          return {
            id: client.id,
            name: client.name,
            company: client.company || "",
            avatar: client.avatar,
            unread_count: count || 0,
            last_message: lastMessage?.message,
            last_message_date: lastMessage?.created_at,
          };
        }));
        
        // Sort clients by unread count first, then by latest message
        clientsWithChatInfo.sort((a, b) => {
          if (a.unread_count > 0 && b.unread_count === 0) return -1;
          if (a.unread_count === 0 && b.unread_count > 0) return 1;
          
          const dateA = a.last_message_date ? new Date(a.last_message_date).getTime() : 0;
          const dateB = b.last_message_date ? new Date(b.last_message_date).getTime() : 0;
          
          return dateB - dateA;
        });
        
        setClients(clientsWithChatInfo);
      } catch (error) {
        console.error("Error fetching clients with chat info:", error);
        toast.error("Failed to load client chat data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchClientsWithChatInfo();
    
    // Subscribe to real-time updates for messages
    const channel = supabase
      .channel('client_messages_changes')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'client_messages'
        }, 
        () => {
          fetchClientsWithChatInfo();
        })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Helper functions
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const formatLastMessageTime = (dateString?: string) => {
    if (!dateString) return "";
    
    const messageDate = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - messageDate.getTime();
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);
    
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return messageDate.toLocaleDateString();
  };

  const handleClientClick = (clientId: string) => {
    navigate(`/admin/chat/${clientId}`);
  };

  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center">
          <MessageSquare className="mr-2 h-5 w-5" />
          Client Messages
        </CardTitle>
        <div className="relative">
          <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search clients..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">
              {searchTerm ? "No clients match your search" : "No clients with messages yet"}
            </p>
          </div>
        ) : (
          <ul className="divide-y">
            {filteredClients.map((client) => (
              <li key={client.id} className="hover:bg-muted/50 cursor-pointer">
                <Button
                  variant="ghost"
                  className="w-full justify-start p-3 rounded-none h-auto"
                  onClick={() => handleClientClick(client.id)}
                >
                  <div className="flex items-center w-full">
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        {client.avatar ? (
                          <img src={client.avatar} alt={client.name} />
                        ) : (
                          <AvatarFallback>
                            {getInitials(client.name)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      {client.unread_count > 0 && (
                        <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-primary text-white">
                          {client.unread_count}
                        </Badge>
                      )}
                    </div>
                    <div className="ml-3 flex-1 overflow-hidden">
                      <div className="flex justify-between items-center">
                        <p className="font-medium truncate">{client.name}</p>
                        {client.last_message_date && (
                          <span className="text-xs text-muted-foreground">
                            {formatLastMessageTime(client.last_message_date)}
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {client.last_message || "No messages yet"}
                        </p>
                        {client.company && (
                          <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                            {client.company}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
