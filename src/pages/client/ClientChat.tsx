
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useClientAuth } from "@/contexts/client-auth-context";
import { SendIcon, Paperclip, Image as ImageIcon, Loader2, File } from "lucide-react";
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
  const [clientId, setClientId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<any>(null);

  // First get client ID from user ID
  useEffect(() => {
    const fetchClientId = async () => {
      if (!user?.id) return;
      
      try {
        console.log("Fetching client ID for user:", user.id);
        const { data, error } = await supabase
          .from("clients")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
          
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

  useEffect(() => {
    if (!clientId) {
      console.log("No client ID yet, skipping message fetch");
      return;
    }

    const fetchMessages = async () => {
      try {
        setIsLoading(true);
        console.log("Fetching messages for client:", clientId);
        
        // Modified query to avoid ambiguous column reference
        const { data, error } = await supabase
          .from("client_messages")
          .select(`
            id,
            message,
            sender_id,
            client_id,
            is_from_client,
            is_read,
            created_at,
            attachment_url,
            attachment_type,
            profiles(full_name)
          `)
          .eq("client_id", clientId)
          .order("created_at", { ascending: true });
        
        if (error) {
          console.error("Error fetching messages:", error);
          throw error;
        }
        
        console.log("Messages fetched:", data.length);
        
        // Mark all unread admin messages as read
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
      } catch (error: any) {
        console.error("Error fetching messages:", error);
        toast.error(error.message || "Could not load messages");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
    setupRealtimeSubscription();
    
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [clientId, user]);

  const setupRealtimeSubscription = () => {
    if (!clientId) return;
    
    // Clean up existing subscription if any
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
    
    // Create a new subscription
    const channel = supabase
      .channel(`client_chat_${clientId}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'client_messages',
          filter: `client_id=eq.${clientId}`
        }, 
        async (payload) => {
          console.log("New message received:", payload);
          const newMessage = payload.new as any;
          
          if (!newMessage.is_from_client) {
            // Mark message as read since client is viewing it
            await supabase
              .from("client_messages")
              .update({ is_read: true })
              .eq("id", newMessage.id);
          }
          
          // Get sender name
          let senderName = "";
          if (newMessage.is_from_client) {
            senderName = user?.name || "You";
          } else {
            try {
              const { data } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("id", newMessage.sender_id)
                .maybeSingle();
              
              senderName = data?.full_name || "Support Staff";
            } catch (error) {
              senderName = "Support Staff";
            }
          }
          
          setMessages(prev => [
            ...prev, 
            {...newMessage, sender_name: senderName}
          ]);
        })
      .subscribe((status) => {
        console.log("Realtime subscription status:", status);
        if (status !== 'SUBSCRIBED') {
          console.error("Failed to subscribe to realtime updates");
        }
      });
    
    channelRef.current = channel;
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !file) return;
    if (!user?.id || !clientId) {
      toast.error("Not connected. Please reload the page.");
      return;
    }
    
    try {
      setIsSending(true);
      console.log("Sending message for client:", clientId);
      
      let attachmentUrl = null;
      let attachmentType = null;
      
      if (file) {
        try {
          console.log("Uploading file:", file.name);
          
          // Check if the bucket exists and create if not
          const { data: buckets } = await supabase.storage.listBuckets();
          const chatBucket = buckets?.find(bucket => bucket.name === 'chat-attachments');
          
          if (!chatBucket) {
            console.log("Creating chat-attachments bucket");
            const { error: bucketError } = await supabase.storage.createBucket('chat-attachments', {
              public: true
            });
            
            if (bucketError) {
              console.error("Error creating bucket:", bucketError);
              throw bucketError;
            }
          }
          
          const fileExt = file.name.split('.').pop();
          const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
          const filePath = `client-attachments/${clientId}/${fileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from('chat-attachments')
            .upload(filePath, file);
          
          if (uploadError) {
            console.error("Error uploading file:", uploadError);
            throw uploadError;
          }
          
          const { data: { publicUrl } } = supabase.storage
            .from('chat-attachments')
            .getPublicUrl(filePath);
          
          attachmentUrl = publicUrl;
          attachmentType = file.type.startsWith('image/') ? 'image' : 'file';
          console.log("File uploaded successfully:", attachmentUrl, attachmentType);
        } catch (uploadError) {
          console.error("File upload failed:", uploadError);
          toast.error("Failed to upload file. Please try again.");
        }
      }
      
      const messageData = {
        client_id: clientId,
        sender_id: user.id,
        is_from_client: true,
        message: newMessage.trim(),
        attachment_url: attachmentUrl,
        attachment_type: attachmentType,
        is_read: false
      };
      
      console.log("Inserting message data:", messageData);
      
      const { error } = await supabase
        .from("client_messages")
        .insert(messageData);
      
      if (error) {
        console.error("Error sending message:", error);
        throw error;
      }
      
      console.log("Message sent successfully");
      
      setNewMessage("");
      setFile(null);
      
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error(error.message || "Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error("File is too large. Maximum size is 10MB.");
        return;
      }
      setFile(selectedFile);
    }
  };

  const removeSelectedFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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
                    {msg.attachment_url && msg.attachment_type === 'image' && (
                      <a 
                        href={msg.attachment_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block mb-2"
                      >
                        <img 
                          src={msg.attachment_url} 
                          alt="Attachment" 
                          className="rounded max-h-60 max-w-full"
                        />
                      </a>
                    )}
                    
                    {msg.attachment_url && msg.attachment_type !== 'image' && (
                      <a 
                        href={msg.attachment_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center mb-2 text-blue-500 hover:underline"
                      >
                        <File className="h-4 w-4 mr-1" />
                        Attachment
                      </a>
                    )}

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
        
        {file && (
          <div className="px-4 py-2 border-t">
            <div className="flex items-center justify-between bg-muted rounded p-2">
              <div className="flex items-center">
                {file.type.startsWith('image/') ? (
                  <ImageIcon className="h-4 w-4 mr-2" />
                ) : (
                  <Paperclip className="h-4 w-4 mr-2" />
                )}
                <span className="text-sm truncate max-w-[200px]">{file.name}</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={removeSelectedFile}
              >
                &times;
              </Button>
            </div>
          </div>
        )}
        
        <CardFooter className="p-4 border-t">
          <form 
            className="flex gap-2 w-full"
            onSubmit={(e) => {
              e.preventDefault(); 
              handleSendMessage();
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileChange}
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            />
            <Textarea
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={isSending}
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <Button 
              type="button" 
              variant="outline" 
              size="icon" 
              disabled={isSending}
              onClick={handleFileSelect}
            >
              <Paperclip className="h-4 w-4" />
              <span className="sr-only">Attach file</span>
            </Button>
            <Button type="submit" disabled={(!newMessage.trim() && !file) || isSending}>
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
