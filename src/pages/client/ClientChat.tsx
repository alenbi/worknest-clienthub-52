
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
  markMessageAsRead,
  testFirebaseConnection 
} from "@/lib/firebase-chat-utils";
import { ChatMessageList } from "@/components/chat/ChatMessageList";
import { ChatInput } from "@/components/chat/ChatInput";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

const ClientChat = () => {
  const { user } = useClientAuth();
  const [clientId, setClientId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionTested, setConnectionTested] = useState(false);
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
          setError("Could not load client profile");
          setIsLoading(false);
          return;
        }
        
        console.log("Client ID found:", data?.id);
        setClientId(data?.id || null);
      } catch (error) {
        console.error("Failed to fetch client ID:", error);
        setError("An error occurred while loading your profile");
        setIsLoading(false);
      }
    };
    
    fetchClientId();
  }, [user]);

  // Test connection to Firebase
  useEffect(() => {
    if (!clientId) return;
    
    const testConnection = async () => {
      try {
        const isConnected = await testFirebaseConnection();
        console.log("Firebase connection test result:", isConnected);
        setConnectionTested(true);
        
        if (!isConnected) {
          setError("Failed to connect to chat service. Please refresh the page and try again.");
          console.log("Firebase connection failed");
        }
      } catch (error) {
        console.error("Error testing Firebase connection:", error);
        setError("Failed to connect to chat service. Please refresh the page and try again.");
        setConnectionTested(true);
      }
    };
    
    testConnection();
  }, [clientId]);

  // Fetch messages and set up subscription once we have clientId
  useEffect(() => {
    if (!clientId) {
      if (user) {
        console.log("No client ID yet, waiting...");
      }
      return;
    }

    if (!connectionTested) {
      console.log("Connection test not completed yet, waiting...");
      return;
    }

    // If connection test failed, don't try to fetch messages
    if (error && error.includes("Failed to connect")) {
      setIsLoading(false);
      return;
    }

    const loadMessages = async () => {
      try {
        setIsLoading(true);
        setError(null);
        console.log("Fetching messages for client:", clientId);
        
        // Fetch messages
        const messages = await fetchClientMessages(clientId);
        
        // Mark all unread admin messages as read
        for (const msg of messages) {
          if (!msg.is_from_client && !msg.is_read) {
            await markMessageAsRead(clientId, msg.id);
          }
        }
        
        console.log("Messages fetched:", messages.length);
        setMessages(messages);
        setIsLoading(false);
      } catch (error: any) {
        console.error("Error fetching messages:", error);
        toast.error("Could not load messages");
        setError("Could not load messages: " + (error.message || "Unknown error"));
        setIsLoading(false);
      }
    };

    loadMessages();
    
    // Set up realtime subscription
    try {
      console.log("Setting up message subscription for client:", clientId);
      const unsubscribe = subscribeToChatMessages(clientId, (newMessage) => {
        console.log("New message received:", newMessage);
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
    } catch (error: any) {
      console.error("Error setting up message subscription:", error);
      toast.error("Failed to connect to chat service");
      setError("Failed to connect to chat service: " + (error.message || "Unknown error"));
    }
    
    return () => {
      if (unsubscribeRef.current) {
        console.log("Cleaning up message subscription");
        unsubscribeRef.current();
      }
    };
  }, [clientId, connectionTested, error]);

  const handleSendMessage = async (messageText: string, file: File | null) => {
    if ((!messageText.trim() && !file) || !user?.id || !clientId) {
      return;
    }
    
    try {
      setIsSending(true);
      setError(null);
      
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
      setError("Failed to send message: " + (error.message || "Unknown error"));
    } finally {
      setIsSending(false);
    }
  };

  const handleRetry = () => {
    if (!clientId) return;
    
    setError(null);
    setIsLoading(true);
    setConnectionTested(false);
    
    // Test connection and reload messages
    testFirebaseConnection().then((connected) => {
      setConnectionTested(true);
      if (!connected) {
        setError("Failed to connect to chat service. Please refresh the page and try again.");
        setIsLoading(false);
        return;
      }
      
      fetchClientMessages(clientId)
        .then(messages => {
          setMessages(messages);
          setIsLoading(false);
        })
        .catch(error => {
          console.error("Error reloading messages:", error);
          setError("Failed to reload messages: " + (error.message || "Unknown error"));
          setIsLoading(false);
        });
    });
  };

  if (!clientId && !isLoading) {
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
          {error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-4">
                <p className="text-destructive font-semibold mb-2">Error</p>
                <p className="text-muted-foreground">{error}</p>
                <Button 
                  className="mt-4"
                  onClick={handleRetry}
                  variant="outline"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </div>
          ) : (
            <ChatMessageList 
              messages={messages} 
              currentUserId={user?.id || ''} 
              isLoading={isLoading}
            />
          )}
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
