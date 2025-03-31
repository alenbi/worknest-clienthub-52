import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useClientAuth } from "@/contexts/client-auth-context";
import { SendIcon, Paperclip, Image as ImageIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Message {
  id: string;
  message: string;
  sender_id: string;
  is_from_client: boolean;
  created_at: string;
  sender_name?: string;
  attachment_url?: string;
  attachment_type?: string;
}

const ClientChat = () => {
  const { user } = useClientAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user?.id) return;

    const fetchMessages = async () => {
      try {
        setIsLoading(true);
        
        const { data: clientData, error: clientError } = await supabase
          .from("clients")
          .select("id")
          .eq("user_id", user.id)
          .single();
        
        if (clientError) throw clientError;
        
        if (!clientData) {
          toast.error("Client profile not found");
          setIsLoading(false);
          return;
        }
        
        const clientId = clientData.id;
        
        const { data, error } = await supabase
          .from("client_messages")
          .select("*, profiles(full_name)")
          .eq("client_id", clientId)
          .order("created_at", { ascending: true });
        
        if (error) throw error;
        
        await supabase
          .from("client_messages")
          .update({ is_read: true })
          .eq("client_id", clientId)
          .eq("is_from_client", false)
          .eq("is_read", false);
        
        const formattedMessages = data.map((msg: any) => ({
          ...msg,
          sender_name: msg.is_from_client 
            ? (user?.name || "You")
            : (msg.profiles?.full_name || "Support Staff")
        }));
        
        setMessages(formattedMessages);
      } catch (error) {
        console.error("Error fetching messages:", error);
        toast.error("Could not load messages");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
    
    const setupSubscription = async () => {
      try {
        const { data: clientData, error: clientError } = await supabase
          .from("clients")
          .select("id")
          .eq("user_id", user.id)
          .single();
          
        if (clientError) throw clientError;
        if (!clientData) return;
        
        const clientId = clientData.id;
        
        const channel = supabase
          .channel('client_messages_changes')
          .on('postgres_changes', 
            { 
              event: 'INSERT', 
              schema: 'public', 
              table: 'client_messages',
              filter: `client_id=eq.${clientId}`
            }, 
            async (payload) => {
              const newMessage = payload.new as Message;
              
              if (!newMessage.is_from_client) {
                await supabase
                  .from("client_messages")
                  .update({ is_read: true })
                  .eq("id", newMessage.id);
              }
              
              if (newMessage.is_from_client) {
                newMessage.sender_name = user?.name || "You";
              } else {
                try {
                  const { data } = await supabase
                    .from("profiles")
                    .select("full_name")
                    .eq("id", newMessage.sender_id)
                    .single();
                  
                  newMessage.sender_name = data?.full_name || "Support Staff";
                } catch (error) {
                  newMessage.sender_name = "Support Staff";
                }
              }
              
              setMessages(prev => [...prev, newMessage]);
            })
          .subscribe();
          
        return () => {
          supabase.removeChannel(channel);
        };
      } catch (error) {
        console.error("Error setting up message subscription:", error);
      }
    };
    
    const unsubscribe = setupSubscription();
    
    return () => {
      if (unsubscribe && typeof unsubscribe.then === 'function') {
        unsubscribe.then(unsub => {
          if (unsub) unsub();
        });
      }
    };
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !file) return;
    if (!user?.id) return;
    
    try {
      setIsSending(true);
      
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("id")
        .eq("user_id", user.id)
        .single();
        
      if (clientError) throw clientError;
      if (!clientData) {
        toast.error("Client profile not found");
        return;
      }
      
      const clientId = clientData.id;
      
      let attachmentUrl = null;
      let attachmentType = null;
      
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `client-attachments/${clientId}/${fileName}`;
        
        const { error: uploadError, data } = await supabase.storage
          .from('chat-attachments')
          .upload(filePath, file);
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('chat-attachments')
          .getPublicUrl(filePath);
        
        attachmentUrl = publicUrl;
        attachmentType = file.type.startsWith('image/') ? 'image' : 'file';
      }
      
      const { error } = await supabase
        .from("client_messages")
        .insert({
          client_id: clientId,
          sender_id: user.id,
          is_from_client: true,
          message: newMessage.trim(),
          attachment_url: attachmentUrl,
          attachment_type: attachmentType,
          is_read: false
        });
      
      if (error) throw error;
      
      setNewMessage("");
      setFile(null);
      
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
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
        <CardFooter className="p-4 border-t">
          <form 
            className="flex gap-2 w-full"
            onSubmit={(e) => {
              e.preventDefault(); 
              handleSendMessage();
            }}
          >
            <Textarea
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={isSending}
              className="flex-1"
            />
            <Button type="button" variant="outline" size="icon" disabled={isSending}>
              <Paperclip className="h-4 w-4" />
              <span className="sr-only">Attach file</span>
            </Button>
            <Button type="submit" disabled={!newMessage.trim() || isSending}>
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <SendIcon className="h-4 w-4" />
              )}
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ClientChat;
