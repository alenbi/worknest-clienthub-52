
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { 
  ChatMessage, 
  subscribeToChatChannel, 
  fetchClientMessages, 
  sendMessage,
  uploadChatFile 
} from "@/lib/chat-utils";
import { ChatMessageList } from "@/components/chat/ChatMessageList";
import { ChatInput } from "@/components/chat/ChatInput";

interface Client {
  id: string;
  name: string;
  email: string;
  company?: string;
  avatar?: string;
}

export function AdminChatRoom() {
  const { clientId } = useParams<{ clientId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Fetch client details
  useEffect(() => {
    if (!clientId) return;
    
    const fetchClientDetails = async () => {
      try {
        const { data, error } = await supabase
          .from("clients")
          .select("*")
          .eq("id", clientId)
          .single();
        
        if (error) {
          console.error("Error fetching client details:", error);
          throw error;
        }
        
        if (!data) {
          toast.error("Client not found");
          navigate("/admin/chat");
          return;
        }
        
        setClient(data);
      } catch (error) {
        console.error("Error fetching client details:", error);
        toast.error("Error loading client details");
        navigate("/admin/chat");
      }
    };

    fetchClientDetails();
  }, [clientId, navigate]);

  // Fetch messages and set up realtime subscription
  useEffect(() => {
    if (!clientId || !client || !user?.id) return;
    
    const loadMessages = async () => {
      try {
        setIsLoading(true);
        
        // Fetch messages
        const messages = await fetchClientMessages(clientId);
        
        // Mark all unread client messages as read
        await supabase
          .from("client_messages")
          .update({ is_read: true })
          .eq("client_id", clientId)
          .eq("is_from_client", true)
          .eq("is_read", false);
        
        setMessages(messages);
      } catch (error) {
        console.error("Error loading messages:", error);
        toast.error("Failed to load chat messages");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadMessages();
    
    // Set up realtime subscription
    const channel = subscribeToChatChannel(clientId, true, (newMessage) => {
      setMessages(prev => [...prev, newMessage]);
    });
    
    channelRef.current = channel;
    
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [clientId, client, user?.id]);

  const handleSendMessage = async (messageText: string, file: File | null) => {
    if ((!messageText.trim() && !file) || !clientId || !user?.id) {
      return;
    }
    
    try {
      setIsSending(true);
      
      let attachmentUrl = null;
      let attachmentType = null;
      
      // Upload file if provided
      if (file) {
        try {
          const uploadResult = await uploadChatFile(file, clientId, true);
          attachmentUrl = uploadResult.url;
          attachmentType = uploadResult.type;
        } catch (error) {
          console.error("File upload failed:", error);
          toast.error("Failed to upload file. Please try again.");
        }
      }
      
      // Send message
      const sentMessage = await sendMessage({
        clientId,
        senderId: user.id,
        message: messageText,
        isFromClient: false,
        attachmentUrl,
        attachmentType
      });

      // Add sender name to sent message for immediate display
      if (sentMessage) {
        const { data } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();
        
        const messageWithName = {
          ...sentMessage,
          sender_name: data?.full_name || "You"
        };
        
        // Update messages locally for immediate feedback
        setMessages(prev => [...prev, messageWithName]);
      }
      
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error(error.message || "Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  if (isLoading || !client) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mr-2"></div>
        <span>Loading chat...</span>
      </div>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b px-6 py-4">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="mr-2"
            onClick={() => navigate("/admin/chat")}
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back</span>
          </Button>
          <Avatar className="h-8 w-8 mr-2">
            {client.avatar ? (
              <img src={client.avatar} alt={client.name} />
            ) : (
              <AvatarFallback>
                {getInitials(client.name)}
              </AvatarFallback>
            )}
          </Avatar>
          <div>
            <CardTitle className="text-lg">{client.name}</CardTitle>
            <p className="text-sm text-muted-foreground">{client.company}</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto p-0">
        <ChatMessageList 
          messages={messages} 
          currentUserId={user?.id || ''} 
          isLoading={isLoading}
          emptyMessage="No messages yet. Start the conversation by sending a message below."
        />
      </CardContent>
      
      <ChatInput 
        onSendMessage={handleSendMessage}
        isLoading={isSending}
      />
    </Card>
  );
}
