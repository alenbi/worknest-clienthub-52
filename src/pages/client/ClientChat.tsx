
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClientAuth } from "@/contexts/client-auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Send, PaperclipIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

// Define ClientMessage interface for type safety
interface ClientMessage {
  id: string;
  client_id: string;
  sender_id: string;
  is_from_client: boolean;
  is_read: boolean;
  message: string;
  created_at: string;
  attachment_url?: string;
  attachment_type?: string;
}

const ClientChat = () => {
  const { user } = useClientAuth();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ClientMessage[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch client ID from database based on user ID
  useEffect(() => {
    const fetchClientId = async () => {
      if (!user?.id) return;

      try {
        console.log("Fetching client ID for user:", user.id);
        const { data, error } = await supabase
          .from("clients")
          .select("id")
          .eq("user_id", user.id)
          .single();
        
        if (error) {
          console.error("Error fetching client ID:", error);
          setError(`Could not find client profile: ${error.message}`);
          setIsLoading(false);
          return;
        }
        
        console.log("Client ID found:", data?.id);
        if (data) {
          setClientId(data.id);
        }
      } catch (err) {
        console.error("Exception fetching client ID:", err);
        setError("An unexpected error occurred while loading your profile");
        setIsLoading(false);
      }
    };

    if (user) {
      fetchClientId();
    }
  }, [user]);

  // Fetch messages for this client
  useEffect(() => {
    const fetchMessages = async () => {
      if (!clientId) return;

      try {
        console.log("Fetching messages for client:", clientId);
        setIsLoading(true);
        const { data, error } = await supabase
          .from("client_messages")
          .select("*")
          .eq("client_id", clientId)
          .order("created_at", { ascending: true });
        
        if (error) {
          console.error("Error fetching messages:", error);
          setError(`Could not load messages: ${error.message}`);
          setIsLoading(false);
          return;
        }
        
        console.log(`Loaded ${data?.length || 0} messages`);
        setMessages(data as ClientMessage[]);
        
        // Mark all unread messages from admin as read
        const unreadAdminMessages = data.filter(
          msg => !msg.is_from_client && !msg.is_read
        );
        
        if (unreadAdminMessages.length > 0) {
          console.log(`Marking ${unreadAdminMessages.length} messages as read`);
          const unreadIds = unreadAdminMessages.map(msg => msg.id);
          await supabase
            .from("client_messages")
            .update({ is_read: true })
            .in("id", unreadIds);
        }
      } catch (err) {
        console.error("Exception fetching messages:", err);
        setError("An unexpected error occurred while loading messages");
      } finally {
        setIsLoading(false);
      }
    };

    if (clientId) {
      fetchMessages();
      
      // Set up realtime subscription for new messages
      const channel = supabase
        .channel('client_messages_changes')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'client_messages',
          filter: `client_id=eq.${clientId}`
        }, (payload) => {
          console.log("Received new message:", payload);
          const newMessage = payload.new as ClientMessage;
          setMessages(prev => [...prev, newMessage]);
          
          // If message is from admin, mark as read
          if (!newMessage.is_from_client && !newMessage.is_read) {
            supabase
              .from("client_messages")
              .update({ is_read: true })
              .eq("id", newMessage.id);
          }
        })
        .subscribe();

      return () => {
        console.log("Unsubscribing from client_messages_changes channel");
        supabase.removeChannel(channel);
      };
    }
  }, [clientId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || !clientId || !user?.id) return;
    
    try {
      setIsSending(true);
      console.log("Sending message:", message.trim());
      
      const newMessage = {
        client_id: clientId,
        sender_id: user.id,
        is_from_client: true,
        message: message.trim(),
        is_read: false
      };
      
      const { error } = await supabase
        .from("client_messages")
        .insert(newMessage);
      
      if (error) {
        console.error("Error sending message:", error);
        toast.error(`Failed to send message: ${error.message}`);
        return;
      }
      
      setMessage("");
    } catch (err) {
      console.error("Exception sending message:", err);
      toast.error("An unexpected error occurred while sending your message");
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
        <span>Loading conversation...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-destructive mb-4">
          <p className="font-semibold text-lg">Error loading chat</p>
          <p>{error}</p>
        </div>
        <Button onClick={() => window.location.reload()}>Try again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-[calc(100vh-10rem)] flex flex-col">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Chat Support</h1>
        <p className="text-muted-foreground">
          Chat with our support team
        </p>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle>Conversation</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length > 0 ? (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.is_from_client ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      msg.is_from_client
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <div className="break-words">{msg.message}</div>
                    <div
                      className={`text-xs mt-1 ${
                        msg.is_from_client
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      }`}
                    >
                      {format(new Date(msg.created_at), "MMM d, h:mm a")}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-muted-foreground">
                No messages yet. Start a conversation!
              </p>
            </div>
          )}
        </CardContent>
        <div className="p-4 border-t">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isSending}
            />
            <Button type="button" variant="outline" size="icon" disabled={isSending}>
              <PaperclipIcon className="h-4 w-4" />
              <span className="sr-only">Attach file</span>
            </Button>
            <Button type="submit" disabled={!message.trim() || isSending}>
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
};

export default ClientChat;
