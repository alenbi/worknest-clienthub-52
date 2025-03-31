
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useClientAuth } from "@/contexts/client-auth-context";
import { toast } from "sonner";
import { 
  ChatMessage, 
  subscribeToChatChannel,
  fetchClientMessages, 
  sendMessage,
  uploadChatFile 
} from "@/lib/chat-utils";
import { ChatMessageList } from "@/components/chat/ChatMessageList";
import { ChatInput } from "@/components/chat/ChatInput";

const ClientChat = () => {
  const { user } = useClientAuth();
  const [clientId, setClientId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Get client ID from user ID
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
          toast.error("Could not load client profile");
          return;
        }
        
        console.log("Client ID found:", data?.id);
        setClientId(data?.id || null);
      } catch (error) {
        console.error("Failed to fetch client ID:", error);
      }
    };
    
    fetchClientId();
  }, [user]);

  // Fetch messages and set up subscription once we have clientId
  useEffect(() => {
    if (!clientId) {
      console.log("No client ID yet, skipping message fetch");
      return;
    }

    const loadMessages = async () => {
      try {
        setIsLoading(true);
        console.log("Fetching messages for client:", clientId);
        
        // Fetch messages
        const messages = await fetchClientMessages(clientId);
        
        // Mark all unread admin messages as read
        if (messages.length > 0) {
          await supabase
            .from("client_messages")
            .update({ is_read: true })
            .eq("client_id", clientId)
            .eq("is_from_client", false)
            .eq("is_read", false);
        }
        
        console.log("Messages fetched:", messages.length);
        setMessages(messages);
      } catch (error) {
        console.error("Error fetching messages:", error);
        toast.error("Could not load messages");
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
    
    // Set up realtime subscription
    const channel = subscribeToChatChannel(clientId, false, (newMessage) => {
      setMessages(prev => [...prev, newMessage]);
    });
    
    channelRef.current = channel;
    
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [clientId]);

  const handleSendMessage = async (messageText: string, file: File | null) => {
    if ((!messageText.trim() && !file) || !user?.id || !clientId) {
      return;
    }
    
    try {
      setIsSending(true);
      
      let attachmentUrl = null;
      let attachmentType = null;
      
      // Upload file if provided
      if (file) {
        try {
          const uploadResult = await uploadChatFile(file, clientId, false);
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
        isFromClient: true,
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

  if (!clientId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-xl font-semibold mb-2">Account not linked</p>
          <p className="text-muted-foreground">Your user account is not linked to a client profile.</p>
        </div>
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
        
        <CardContent className="flex-1 overflow-y-auto p-0">
          <ChatMessageList 
            messages={messages} 
            currentUserId={user?.id || ''} 
            isLoading={isLoading}
          />
        </CardContent>
        
        <ChatInput 
          onSendMessage={handleSendMessage}
          isLoading={isSending}
        />
      </Card>
    </div>
  );
};

export default ClientChat;
