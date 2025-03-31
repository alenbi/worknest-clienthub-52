
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { ArrowLeft, SendIcon, Paperclip, Image as ImageIcon, Loader2, User, File } from "lucide-react";
import { format } from "date-fns";
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
  const [newMessage, setNewMessage] = useState("");
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        
        setClient(data);
      } catch (error) {
        console.error("Error fetching client details:", error);
        toast.error("Error loading client details");
        navigate("/admin/chat");
      }
    };

    fetchClientDetails();
  }, [clientId, navigate]);

  useEffect(() => {
    if (!clientId) return;
    
    const fetchMessages = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from("client_messages")
          .select(`
            *,
            profiles:sender_id(full_name)
          `)
          .eq("client_id", clientId)
          .order("created_at", { ascending: true });
        
        if (error) {
          console.error("Error fetching messages:", error);
          throw error;
        }
        
        // Mark all messages from client as read
        await supabase
          .from("client_messages")
          .update({ is_read: true })
          .eq("client_id", clientId)
          .eq("is_from_client", true)
          .eq("is_read", false);
        
        // Transform data to include sender name
        const formattedMessages = data.map((msg: any) => ({
          ...msg,
          sender_name: msg.is_from_client 
            ? (client?.name || "Client") 
            : (msg.profiles?.full_name || "Support Staff")
        }));
        
        setMessages(formattedMessages);
      } catch (error) {
        console.error("Error fetching messages:", error);
        toast.error("Failed to load chat messages");
      } finally {
        setIsLoading(false);
      }
    };

    if (client) {
      fetchMessages();
      
      // Subscribe to real-time updates
      const channel = supabase
        .channel('admin_client_messages_changes')
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'client_messages',
            filter: `client_id=eq.${clientId}`
          }, 
          async (payload) => {
            const newMessage = payload.new as ChatMessage;
            
            // Mark message as read if it's from client
            if (newMessage.is_from_client) {
              await supabase
                .from("client_messages")
                .update({ is_read: true })
                .eq("id", newMessage.id);
            }
            
            // Fetch sender name
            let senderName = newMessage.is_from_client ? client?.name || "Client" : "Support Staff";
            
            if (!newMessage.is_from_client) {
              try {
                const { data } = await supabase
                  .from("profiles")
                  .select("full_name")
                  .eq("id", newMessage.sender_id)
                  .single();
                
                if (data?.full_name) {
                  senderName = data.full_name;
                }
              } catch (error) {
                console.error("Error fetching sender name:", error);
              }
            }
            
            setMessages(prev => [...prev, {...newMessage, sender_name: senderName}]);
          })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [clientId, client, navigate]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !file) return;
    if (!clientId || !user) {
      toast.error("Not connected. Please reload the page.");
      return;
    }
    
    try {
      setIsSending(true);
      
      // Upload file if exists
      let attachmentUrl = null;
      let attachmentType = null;
      
      if (file) {
        try {
          // First check if the storage bucket exists
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
          const filePath = `admin-attachments/${clientId}/${fileName}`;
          
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
          // Continue without the attachment
        }
      }
      
      // Insert message
      const { error } = await supabase
        .from("client_messages")
        .insert({
          client_id: clientId,
          sender_id: user.id,
          is_from_client: false,
          message: newMessage.trim(),
          attachment_url: attachmentUrl,
          attachment_type: attachmentType,
          is_read: true // Admin messages are marked as read immediately
        });
      
      if (error) {
        console.error("Error sending message:", error);
        throw error;
      }
      
      // Clear input
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
      // Check file size (max 10MB)
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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading chat...</span>
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
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
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
              className={`flex ${msg.is_from_client ? 'justify-start' : 'justify-end'}`}
            >
              <div 
                className={`flex max-w-[80%] ${msg.is_from_client ? 'flex-row' : 'flex-row-reverse'}`}
              >
                <Avatar className={`h-8 w-8 ${msg.is_from_client ? 'mr-2' : 'ml-2'}`}>
                  <AvatarFallback className={
                    msg.is_from_client 
                      ? "bg-blue-500 text-white" 
                      : "bg-primary text-primary-foreground"
                  }>
                    {msg.is_from_client 
                      ? client.name.charAt(0).toUpperCase()
                      : user?.email?.charAt(0).toUpperCase() || "S"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div 
                    className={`rounded-lg px-4 py-2 ${
                      msg.is_from_client 
                        ? 'bg-muted' 
                        : 'bg-primary text-primary-foreground'
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
                    
                    {msg.message}
                  </div>
                  <div 
                    className={`text-xs text-muted-foreground mt-1 ${
                      msg.is_from_client ? 'text-left' : 'text-right'
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
      
      <CardFooter className="border-t p-4">
        <div className="flex w-full items-center space-x-2">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileChange}
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          />
          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleFileSelect}
            disabled={isSending}
          >
            <Paperclip className="h-5 w-5" />
            <span className="sr-only">Attach file</span>
          </Button>
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
  );
}
