
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

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const fetchClientId = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from("clients")
          .select("id, name")
          .eq("user_id", user.id)
          .single();

        if (error) throw error;
        if (data) {
          setClientId(data.id);
          setClientName(data.name || user.email || "Client");
          console.log("Client ID found:", data.id);
        }
      } catch (error) {
        console.error("Error fetching client ID:", error);
        toast.error("Could not load chat");
      }
    };

    fetchClientId();

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [user]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!clientId) return;
      setLoading(true);

      try {
        const fetchedMessages = await fetchClientMessages(clientId);
        console.log("Messages fetched:", fetchedMessages.length);
        setMessages(fetchedMessages);

        for (const msg of fetchedMessages) {
          if (!msg.is_from_client && !msg.is_read) {
            await markMessageAsRead(clientId, msg.id);
          }
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
        toast.error("Could not load messages");
      } finally {
        setLoading(false);
        setTimeout(scrollToBottom, 100);
      }
    };

    const setupSubscription = () => {
      if (!clientId) return;

      try {
        const unsubscribe = subscribeToChatMessages(clientId, (message) => {
          console.log("New message received:", message);
          setMessages(prev => {
            if (prev.find(m => m.id === message.id)) {
              return prev;
            }
            
            const newMessages = [...prev, message];
            return newMessages.sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
          });

          if (!message.is_from_client && !message.is_read) {
            markMessageAsRead(clientId, message.id).catch(console.error);
          }

          setTimeout(scrollToBottom, 100);
        });

        unsubscribeRef.current = unsubscribe;
      } catch (error) {
        console.error("Error setting up chat subscription:", error);
      }
    };

    if (clientId) {
      fetchMessages();
      setupSubscription();
    }
  }, [clientId]);

  const handleSendMessage = async (text: string) => {
    if (!clientId || !user?.id) return;

    try {
      setSending(true);
      
      await sendMessage({
        clientId,
        senderId: user.id,
        senderName: clientName || "Client",
        message: text,
        isFromClient: true
      });
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
      setTimeout(scrollToBottom, 100);
    }
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!clientId) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
        <ChatMessageList 
          messages={messages} 
          currentUserId={user?.id || ""} 
          isLoading={loading}
        />
        <div ref={messagesEndRef} />
      </div>
      
      <div>
        <ChatInput 
          onSendMessage={handleSendMessage} 
          isLoading={sending} 
        />
      </div>
    </div>
  );
};

export default ClientChat;
