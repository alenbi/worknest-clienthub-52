
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  ChatMessage as ChatMessageType,
  subscribeToChatMessages,
  fetchClientMessages, 
  sendMessage,
  uploadChatFile,
  markMessageAsRead
} from "@/lib/firebase-chat-utils";
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
  
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cleanupFunctionRef = useRef<(() => void) | null>(null);

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
        setError(null);
        
        // Fetch messages
        const messages = await fetchClientMessages(clientId);
        
        // Mark messages from client as read
        for (const msg of messages) {
          if (msg.is_from_client && !msg.is_read) {
            await markMessageAsRead(clientId, msg.id);
          }
        }
        
        setMessages(messages);
      } catch (error: any) {
        console.error("Error loading messages:", error);
        toast.error("Failed to load chat messages");
        setError("Failed to load chat messages: " + (error.message || "Unknown error"));
      } finally {
        setIsLoading(false);
      }
    };
    
    loadMessages();
    
    // Set up realtime subscription
    try {
      const unsubscribe = subscribeToChatMessages(
        clientId,
        (newMessage) => {
          setMessages(prev => {
            // Check if message already exists
            if (prev.some(msg => msg.id === newMessage.id)) {
              return prev;
            }
            
            // Mark message as read if it's from client
            if (newMessage.is_from_client) {
              markMessageAsRead(clientId, newMessage.id);
            }
            
            return [...prev, newMessage];
          });
        }
      );
      
      cleanupFunctionRef.current = unsubscribe;
    } catch (error: any) {
      console.error("Error setting up message subscription:", error);
      toast.error("Failed to connect to chat service");
      setError("Failed to connect to chat service: " + (error.message || "Unknown error"));
    }
    
    return () => {
      if (cleanupFunctionRef.current) {
        cleanupFunctionRef.current();
      }
    };
  }, [clientId, client, user?.id]);

  const handleSendMessage = async (messageText: string, file: File | null) => {
    if ((!messageText.trim() && !file) || !clientId || !user?.id) {
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
          const uploadResult = await uploadChatFile(file, clientId, true);
          attachmentUrl = uploadResult.url;
          attachmentType = uploadResult.type;
        } catch (error) {
          console.error("File upload failed:", error);
          toast.error("Failed to upload file. Please try again.");
          throw error;
        }
      }
      
      // Send message
      await sendMessage({
        clientId,
        senderId: user.id,
        senderName: user.full_name || 'Support Agent',
        message: messageText,
        isFromClient: false,
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
  };

  if (isLoading && !client) {
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
            {client?.avatar ? (
              <img src={client.avatar} alt={client.name} />
            ) : (
              <AvatarFallback>
                {client?.name
                  ? client.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                  : "?"}
              </AvatarFallback>
            )}
          </Avatar>
          <div>
            <CardTitle className="text-lg">{client?.name || "Unknown Client"}</CardTitle>
            <p className="text-sm text-muted-foreground">{client?.company || ""}</p>
          </div>
        </div>
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
            emptyMessage="No messages yet. Start the conversation by sending a message below."
          />
        )}
      </CardContent>
      
      <ChatInput 
        onSendMessage={handleSendMessage}
        isLoading={isSending}
      />
    </Card>
  );
}
