
import { useState, useEffect, useRef } from "react";
import { ChatMessage, fetchClientMessages, sendMessage, subscribeToChatMessages, markMessageAsRead } from "@/lib/chat-utils";
import { useClientAuth } from "@/contexts/client-auth-context";
import { ChatMessageList } from "@/components/chat/ChatMessageList";
import { ChatInput } from "@/components/chat/ChatInput";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const ClientChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const { user } = useClientAuth();
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Fetch client ID on component mount
  useEffect(() => {
    const fetchClientId = async () => {
      if (!user?.id) {
        console.log("No user found, cannot fetch client ID");
        setLoading(false);
        setError("You must be logged in to view this chat.");
        return;
      }

      try {
        console.log("Fetching client ID for user:", user.id);
        const { data, error } = await supabase
          .from("clients")
          .select("id, name")
          .eq("user_id", user.id)
          .single();

        if (error) {
          console.error("Error fetching client ID:", error);
          setError("Could not find your client profile. Please contact support.");
          throw error;
        }
        
        if (data) {
          console.log("Client ID found:", data.id);
          setClientId(data.id);
          setClientName(data.name || user.email || "Client");
        } else {
          setError("No client profile found for your account.");
        }
      } catch (error) {
        console.error("Error in fetchClientId:", error);
        toast.error("Could not load chat");
      } finally {
        setLoading(false);
      }
    };

    fetchClientId();

    return () => {
      if (unsubscribeRef.current) {
        console.log("Cleaning up chat subscription");
        unsubscribeRef.current();
      }
    };
  }, [user]);

  // Fetch messages and set up subscription when clientId is available
  useEffect(() => {
    if (!clientId) return;
    
    setLoading(true);
    setError(null);

    const fetchMessages = async () => {
      try {
        console.log("Fetching messages for client:", clientId);
        const fetchedMessages = await fetchClientMessages(clientId);
        console.log("Messages fetched:", fetchedMessages.length);
        
        // Sort messages by creation date
        const sortedMessages = [...fetchedMessages].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        
        setMessages(sortedMessages);

        // Mark messages from admin as read
        for (const msg of sortedMessages) {
          if (!msg.is_from_client && !msg.is_read) {
            await markMessageAsRead(clientId, msg.id);
          }
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
        toast.error("Could not load messages");
        setError("Failed to load your conversation history.");
      } finally {
        setLoading(false);
        setTimeout(scrollToBottom, 100);
      }
    };

    const setupSubscription = () => {
      try {
        console.log("Setting up message subscription for client:", clientId);
        const unsubscribe = subscribeToChatMessages(clientId, (newMessage) => {
          console.log("New message received:", newMessage);
          
          setMessages(prev => {
            // Check if message already exists
            if (prev.some(m => m.id === newMessage.id)) {
              return prev;
            }
            
            // Add new message and sort
            const updatedMessages = [...prev, newMessage];
            return updatedMessages.sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
          });

          // Mark messages from admin as read
          if (!newMessage.is_from_client && !newMessage.is_read) {
            markMessageAsRead(clientId, newMessage.id).catch(console.error);
          }

          setTimeout(scrollToBottom, 100);
        });

        unsubscribeRef.current = unsubscribe;
      } catch (error) {
        console.error("Error setting up chat subscription:", error);
        setError("Failed to connect to chat service. Please refresh the page.");
      }
    };

    fetchMessages();
    setupSubscription();
    
  }, [clientId]);

  const handleSendMessage = async (text: string, file?: File) => {
    if (!clientId || !user?.id) return;
    
    try {
      setSending(true);
      
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
        senderName: clientName || "Client",
        message: text,
        isFromClient: true,
        attachmentUrl,
        attachmentType
      });
      
      // Clear any previous errors on successful send
      setError(null);
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
      setError("Your message couldn't be sent. Please try again.");
    } finally {
      setSending(false);
      setTimeout(scrollToBottom, 100);
    }
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please log in to access the chat.</p>
      </div>
    );
  }

  if (error && !clientId && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-4">
        <p className="text-destructive font-medium mb-2">Error</p>
        <p className="text-muted-foreground mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Refresh Page
        </button>
      </div>
    );
  }

  if (!clientId && loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
        <span>Loading your chat...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-9rem)] bg-white border rounded-lg overflow-hidden">
      <div className="border-b p-4 bg-muted/30">
        <h2 className="text-lg font-semibold">Support Chat</h2>
        <p className="text-sm text-muted-foreground">
          Chat with our support team
        </p>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {error ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <p className="text-destructive font-medium mb-2">Error</p>
            <p className="text-muted-foreground mb-4">{error}</p>
            <button 
              onClick={() => {
                setError(null);
                setLoading(true);
                fetchClientMessages(clientId!).then(msgs => {
                  setMessages(msgs);
                  setLoading(false);
                }).catch(err => {
                  console.error("Error refreshing messages:", err);
                  setError("Failed to refresh messages. Please reload the page.");
                  setLoading(false);
                });
              }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Try Again
            </button>
          </div>
        ) : (
          <ChatMessageList 
            messages={messages} 
            currentUserId={user?.id || ""} 
            isLoading={loading}
          />
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div>
        <ChatInput 
          onSendMessage={handleSendMessage} 
          isLoading={sending}
          disabled={!!error || !clientId} 
        />
      </div>
    </div>
  );
}

export default ClientChat;
