
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useClientAuth } from "@/contexts/client-auth-context";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  ChatMessage, 
  subscribeToChatMessages,
  fetchClientMessages, 
  sendMessage,
  uploadChatFile,
  markMessageAsRead 
} from "@/lib/firebase-chat-utils";
import { ChatMessageList } from "@/components/chat/ChatMessageList";
import { ChatInput } from "@/components/chat/ChatInput";

const ClientChat = () => {
  const { user } = useClientAuth();
  const [clientId, setClientId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

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
        messages.forEach(msg => {
          if (!msg.is_from_client && !msg.is_read) {
            markMessageAsRead(clientId, msg.id);
          }
        });
        
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
    const unsubscribe = subscribeToChatMessages(clientId, (newMessage) => {
      setMessages(prev => {
        // Check if message already exists
        if (prev.some(msg => msg.id === newMessage.id)) {
          return prev;
        }
        
        // Mark message as read if it's from admin
        if (!newMessage.is_from_client) {
          markMessageAsRead(clientId, newMessage.id);
        }
        
        return [...prev, newMessage];
      });
    });
    
    unsubscribeRef.current = unsubscribe;
    
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
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
      
      // Get user name
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      
      const senderName = data?.full_name || "Client";
      
      // Send message
      await sendMessage({
        clientId,
        senderId: user.id,
        senderName,
        message: messageText,
        isFromClient: true,
        attachmentUrl,
        attachmentType
      });
      
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
