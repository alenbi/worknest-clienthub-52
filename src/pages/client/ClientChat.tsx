
import { useState, useEffect, useRef } from "react";
import { useClientAuth } from "@/contexts/client-auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { SendIcon, Image as ImageIcon, Paperclip, User, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  message: string;
  sender_id: string;
  client_id: string;
  is_from_client: boolean;
  created_at: string;
  sender_name: string;
  attachment_url?: string;
  attachment_type?: string;
}

const ClientChat = () => {
  const { user } = useClientAuth();
  const [clientId, setClientId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Find the client ID based on user ID
    const fetchClientId = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from("clients")
          .select("id")
          .eq("user_id", user?.id)
          .single();
        
        if (error) throw error;
        if (data) {
          setClientId(data.id);
        }
      } catch (error) {
        console.error("Error fetching client ID:", error);
        toast.error("Error loading chat data");
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchClientId();
    }
  }, [user]);

  useEffect(() => {
    // Fetch messages when client ID is available
    const fetchMessages = async () => {
      if (!clientId) return;
      
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from("client_messages")
          .select("*, profiles(full_name)")
          .eq("client_id", clientId)
          .order("created_at", { ascending: true });
        
        if (error) throw error;
        
        // Transform data to include sender name
        const formattedMessages = data.map((msg: any) => ({
          ...msg,
          sender_name: msg.is_from_client ? user?.name || "Client" : (msg.profiles?.full_name || "Support Staff")
        }));
        
        setMessages(formattedMessages);
      } catch (error) {
        console.error("Error fetching messages:", error);
        toast.error("Failed to load chat messages");
      } finally {
        setIsLoading(false);
      }
    };

    if (clientId) {
      fetchMessages();
      
      // Subscribe to real-time updates
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
            const newMessage = payload.new as ChatMessage;
            
            // Fetch sender name if it's from staff
            if (!newMessage.is_from_client) {
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
            } else {
              newMessage.sender_name = user?.name || "Client";
            }
            
            setMessages(prev => [...prev, newMessage]);
          })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [clientId, user]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !file) return;
    if (!clientId || !user) return;
    
    try {
      setIsSending(true);
      
      // Upload file if exists
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
      
      // Insert message
      const { error } = await supabase
        .from("client_messages")
        .insert({
          client_id: clientId,
          sender_id: user.id,
          is_from_client: true,
          message: newMessage.trim(),
          attachment_url: attachmentUrl,
          attachment_type: attachmentType
        });
      
      if (error) throw error;
      
      // Clear input
      setNewMessage("");
      setFile(null);
      
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
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
      // Check file size (max 5MB)
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast.error("File is too large. Maximum size is 5MB.");
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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading chat...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Chat Support</h1>
        <p className="text-muted-foreground">
          Chat with our support team
        </p>
      </div>

      <Card className="h-[calc(100vh-12rem)]">
        <CardHeader className="border-b px-6 py-4">
          <CardTitle>Support Conversation</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col p-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <p className="text-muted-foreground">No messages yet.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Start the conversation by sending a message below.
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex ${msg.is_from_client ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`flex max-w-[80%] ${msg.is_from_client ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <Avatar className={`h-8 w-8 ${msg.is_from_client ? 'ml-2' : 'mr-2'}`}>
                      <AvatarFallback className={
                        msg.is_from_client 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-blue-500 text-white"
                      }>
                        {msg.is_from_client 
                          ? user?.name?.charAt(0).toUpperCase() || "C" 
                          : msg.sender_name?.charAt(0).toUpperCase() || "S"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div 
                        className={`rounded-lg px-4 py-2 ${
                          msg.is_from_client 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted'
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
                            <Paperclip className="h-4 w-4 mr-1" />
                            Attachment
                          </a>
                        )}
                        
                        {msg.message}
                      </div>
                      <div 
                        className={`text-xs text-muted-foreground mt-1 ${
                          msg.is_from_client ? 'text-right' : 'text-left'
                        }`}
                      >
                        {msg.sender_name} • {format(new Date(msg.created_at), "p")}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
          
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
        </CardContent>
        <CardFooter className="border-t p-4">
          <div className="flex w-full items-center space-x-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleFileSelect}
              disabled={isSending}
            >
              <Paperclip className="h-5 w-5" />
              <span className="sr-only">Attach file</span>
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileChange}
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            />
            <Textarea
              placeholder="Type your message..."
              className="flex-1"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={isSending}
            />
            <Button 
              type="submit" 
              size="icon" 
              onClick={handleSendMessage}
              disabled={isSending || (!newMessage.trim() && !file)}
            >
              {isSending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <SendIcon className="h-5 w-5" />
              )}
              <span className="sr-only">Send</span>
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ClientChat;
