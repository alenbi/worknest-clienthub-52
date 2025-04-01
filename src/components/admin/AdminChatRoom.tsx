
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
  markMessageAsRead,
  testFirebaseConnection
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
  const [isAdmin, setIsAdmin] = useState(false);
  const cleanupFunctionRef = useRef<(() => void) | null>(null);

  // Ensure the user is an admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;

      try {
        const { data: isAdminData, error: adminError } = await supabase.rpc('is_admin', {
          user_id: user.id
        });

        if (adminError) {
          console.error("Error verifying admin status:", adminError);
          setIsAdmin(false);
          setError("You don't have permission to access this chat.");
          return;
        }

        console.log("Admin status:", isAdminData);
        setIsAdmin(!!isAdminData);
        
        if (!isAdminData) {
          setError("You don't have permission to access this chat.");
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
        setError("Failed to verify your permissions.");
      }
    };

    checkAdminStatus();
  }, [user]);

  // Fetch client details
  useEffect(() => {
    if (!clientId || !isAdmin) return;
    
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
        
        // Test Firebase connection to ensure Firebase is available
        const isFirebaseAvailable = await testFirebaseConnection();
        console.log("Firebase available for admin chat:", isFirebaseAvailable);
      } catch (error) {
        console.error("Error fetching client details:", error);
        toast.error("Error loading client details");
        navigate("/admin/chat");
      }
    };

    fetchClientDetails();
  }, [clientId, navigate, isAdmin]);

  // Fetch messages and setup subscription
  useEffect(() => {
    if (!clientId || !client || !user?.id || !isAdmin) return;
    
    const loadMessages = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log("Loading messages for client:", clientId);
        const messages = await fetchClientMessages(clientId);
        console.log("Fetched messages:", messages.length);
        
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
    
    const setupMessageSubscription = () => {
      try {
        console.log("Setting up message subscription for admin");
        const unsubscribe = subscribeToChatMessages(
          clientId,
          (newMessage) => {
            console.log("New message received in admin chat:", newMessage);
            setMessages(prev => {
              if (prev.some(msg => msg.id === newMessage.id)) {
                return prev;
              }
              
              if (newMessage.is_from_client) {
                markMessageAsRead(clientId, newMessage.id);
              }
              
              const updatedMessages = [...prev, newMessage];
              return updatedMessages.sort((a, b) => 
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );
            });
          }
        );
        
        cleanupFunctionRef.current = unsubscribe;
      } catch (error: any) {
        console.error("Error setting up message subscription:", error);
        toast.error("Failed to connect to chat service");
        setError("Failed to connect to chat service: " + (error.message || "Unknown error"));
      }
    };
    
    loadMessages();
    setupMessageSubscription();
    
    return () => {
      if (cleanupFunctionRef.current) {
        cleanupFunctionRef.current();
      }
    };
  }, [clientId, client, user?.id, isAdmin]);

  const handleSendMessage = async (messageText: string, file?: File) => {
    if (!messageText.trim() && !file || !clientId || !user?.id) {
      return;
    }
    
    try {
      setIsSending(true);
      setError(null);
      
      let attachmentUrl = undefined;
      let attachmentType = undefined;
      
      // If a file was uploaded, handle the upload
      if (file) {
        try {
          const fileName = `${Date.now()}_${file.name}`;
          const filePath = `chat_attachments/${clientId}/${fileName}`;
          
          const { data: uploadData, error: uploadError } = await supabase
            .storage
            .from('chat_attachments')
            .upload(filePath, file);
            
          if (uploadError) throw uploadError;
          
          const { data: urlData } = await supabase
            .storage
            .from('chat_attachments')
            .createSignedUrl(filePath, 60 * 60 * 24 * 7); // 7 days expiry
            
          if (urlData) {
            attachmentUrl = urlData.signedUrl;
            attachmentType = file.type;
          }
        } catch (uploadError) {
          console.error("Error uploading file:", uploadError);
          toast.error("Failed to upload file. Your message will be sent without the attachment.");
        }
      }
      
      await sendMessage({
        clientId,
        senderId: user.id,
        senderName: user.user_metadata?.full_name || user.email || 'Support Agent',
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
        disabled={!!error || !isAdmin}
      />
    </Card>
  );
}
