
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MessageSquare, Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Client {
  id: string;
  name: string;
  email: string;
  company?: string;
  avatar?: string;
  lastMessage?: {
    message: string;
    created_at: string;
    is_read: boolean;
    is_from_client: boolean;
  };
}

export function AdminChatList() {
  const [clients, setClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchClientsWithMessages = async () => {
      try {
        setIsLoading(true);
        
        // Fetch all clients
        const { data: clientsData, error: clientsError } = await supabase
          .from("clients")
          .select("id, name, email, company, avatar")
          .order("name", { ascending: true });
        
        if (clientsError) {
          throw clientsError;
        }
        
        if (!clientsData || clientsData.length === 0) {
          setClients([]);
          setIsLoading(false);
          return;
        }
        
        // Fetch the latest message for each client
        const clientsWithMessages = await Promise.all(
          clientsData.map(async (client) => {
            const { data: messagesData } = await supabase
              .from("client_messages")
              .select("message, created_at, is_read, is_from_client")
              .eq("client_id", client.id)
              .order("created_at", { ascending: false })
              .limit(1);
              
            return {
              ...client,
              lastMessage: messagesData && messagesData.length > 0 ? messagesData[0] : undefined,
            };
          })
        );
        
        // Sort clients with unread messages first, then by latest message time
        const sortedClients = clientsWithMessages.sort((a, b) => {
          // First priority: clients with unread messages from client
          const aHasUnread = a.lastMessage && a.lastMessage.is_from_client && !a.lastMessage.is_read;
          const bHasUnread = b.lastMessage && b.lastMessage.is_from_client && !b.lastMessage.is_read;
          
          if (aHasUnread && !bHasUnread) return -1;
          if (!aHasUnread && bHasUnread) return 1;
          
          // Second priority: latest message time
          const aTime = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : 0;
          const bTime = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : 0;
          
          return bTime - aTime;
        });
        
        setClients(sortedClients);
      } catch (error) {
        console.error("Error fetching clients:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchClientsWithMessages();
    
    // Set up a realtime subscription for new messages
    const channel = supabase
      .channel('client_messages_changes')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'client_messages'
        }, 
        () => {
          // Refetch the clients with messages when a new message arrives
          fetchClientsWithMessages();
        })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (client.company && client.company.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleClientClick = (clientId: string) => {
    navigate(`/admin/chat/${clientId}`);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading clients...</span>
      </div>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="space-y-4">
        <CardTitle>Messages</CardTitle>
        <CardDescription>Chat with your clients</CardDescription>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto p-0">
        {filteredClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No clients found</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              {clients.length === 0
                ? "You haven't added any clients yet."
                : "No clients match your search."}
            </p>
            {clients.length === 0 && (
              <Button onClick={() => navigate("/clients")}>Add Clients</Button>
            )}
          </div>
        ) : (
          <div className="divide-y">
            {filteredClients.map((client) => (
              <div
                key={client.id}
                className="p-4 hover:bg-accent cursor-pointer transition-colors"
                onClick={() => handleClientClick(client.id)}
              >
                <div className="flex items-start gap-4">
                  <Avatar className="h-10 w-10">
                    {client.avatar ? (
                      <img src={client.avatar} alt={client.name} />
                    ) : (
                      <AvatarFallback>{getInitials(client.name)}</AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate">{client.name}</p>
                      {client.lastMessage && (
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(client.lastMessage.created_at), "MMM d, h:mm a")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-sm text-muted-foreground truncate max-w-[260px]">
                        {client.lastMessage ? (
                          <>
                            {client.lastMessage.is_from_client ? "" : "You: "}
                            {client.lastMessage.message || "Attachment"}
                          </>
                        ) : (
                          "No messages yet"
                        )}
                      </p>
                      {client.lastMessage && client.lastMessage.is_from_client && !client.lastMessage.is_read && (
                        <div className="h-2.5 w-2.5 rounded-full bg-primary"></div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
