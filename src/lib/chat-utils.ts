import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ChatMessage {
  id: string;
  message: string;
  sender_id: string;
  client_id: string;
  is_from_client: boolean;
  created_at: string;
  is_read: boolean;
  sender_name?: string;
  attachment_url?: string;
  attachment_type?: string;
}

export type MessageHandler = (message: ChatMessage) => void;

/**
 * Creates and subscribes to a chat channel for a specific client
 */
export function subscribeToChatChannel(
  clientId: string, 
  isAdmin: boolean,
  onNewMessage: MessageHandler
): RealtimeChannel {
  const channelName = isAdmin ? `admin_chat_${clientId}` : `client_chat_${clientId}`;
  
  // Create a channel subscription
  const channel = supabase
    .channel(channelName)
    .on('postgres_changes', 
      { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'client_messages',
        filter: `client_id=eq.${clientId}`
      }, 
      async (payload) => {
        console.log("New message received via realtime:", payload);
        
        try {
          const newMessage = payload.new as ChatMessage;
          
          // Mark message as read if appropriate
          if ((isAdmin && newMessage.is_from_client) || (!isAdmin && !newMessage.is_from_client)) {
            await markMessageAsRead(newMessage.id);
          }
          
          // Get sender name if needed
          let senderName = "Unknown User";
          
          try {
            const { data } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", newMessage.sender_id)
              .single();
            
            if (data) {
              senderName = data.full_name;
            }
          } catch (error) {
            console.error("Error fetching sender name:", error);
          }
          
          // Call the message handler with the complete message
          onNewMessage({
            ...newMessage,
            sender_name: senderName
          });
          
        } catch (error) {
          console.error("Error processing realtime message:", error);
        }
      })
    .subscribe((status) => {
      console.log(`Realtime subscription status for ${channelName}:`, status);
      if (status !== 'SUBSCRIBED') {
        console.error("Failed to subscribe to realtime updates");
        toast.error("Chat connection lost. Please refresh the page.");
      }
    });
  
  return channel;
}

/**
 * Marks a message as read
 */
export async function markMessageAsRead(messageId: string): Promise<void> {
  try {
    await supabase
      .from("client_messages")
      .update({ is_read: true })
      .eq("id", messageId);
  } catch (error) {
    console.error("Error marking message as read:", error);
  }
}

/**
 * Sends a new message
 */
export async function sendMessage({
  clientId,
  senderId,
  message,
  isFromClient,
  attachmentUrl = null,
  attachmentType = null
}: {
  clientId: string;
  senderId: string;
  message: string;
  isFromClient: boolean;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
}): Promise<ChatMessage | null> {
  try {
    // Trim message but keep it if it's only an attachment
    const finalMessage = message ? message.trim() : '';
    
    // If no message and no attachment, don't send anything
    if (!finalMessage && !attachmentUrl) {
      return null;
    }
    
    const messageData = {
      client_id: clientId,
      sender_id: senderId,
      is_from_client: isFromClient,
      message: finalMessage,
      attachment_url: attachmentUrl,
      attachment_type: attachmentType,
      is_read: false
    };
    
    const { data, error } = await supabase
      .from("client_messages")
      .insert(messageData)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
}

/**
 * Uploads a file to chat storage and returns the public URL
 */
export async function uploadChatFile(
  file: File, 
  clientId: string,
  isAdmin: boolean
): Promise<{ url: string; type: string }> {
  try {
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
    
    // Generate unique file name and path
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const prefix = isAdmin ? 'admin-attachments' : 'client-attachments';
    const filePath = `${prefix}/${clientId}/${fileName}`;
    
    // Upload the file
    const { error: uploadError } = await supabase.storage
      .from('chat-attachments')
      .upload(filePath, file);
    
    if (uploadError) {
      console.error("Error uploading file:", uploadError);
      throw uploadError;
    }
    
    // Get the public URL
    const { data } = supabase.storage
      .from('chat-attachments')
      .getPublicUrl(filePath);
    
    const fileType = file.type.startsWith('image/') ? 'image' : 'file';
    
    return {
      url: data.publicUrl,
      type: fileType
    };
  } catch (error) {
    console.error("File upload failed:", error);
    throw error;
  }
}

/**
 * Fetches chat messages for a client
 */
export async function fetchClientMessages(clientId: string): Promise<ChatMessage[]> {
  try {
    // Get all messages for this client - FIXED to avoid the ambiguous column reference
    const { data: messages, error } = await supabase
      .from("client_messages")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: true });
    
    if (error) {
      console.error("Error fetching messages:", error);
      throw error;
    }

    if (!messages || messages.length === 0) {
      return [];
    }
    
    // Get unique sender IDs
    const senderIds = messages.map(msg => msg.sender_id).filter((id, i, arr) => arr.indexOf(id) === i);
    
    // Get all profile data in one request
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", senderIds);
    
    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
    }
    
    // Create sender name lookup
    const senderNames: Record<string, string> = {};
    if (profiles) {
      profiles.forEach(profile => {
        senderNames[profile.id] = profile.full_name;
      });
    }
    
    // Add sender names to messages
    const messagesWithNames = messages.map(msg => ({
      ...msg,
      sender_name: senderNames[msg.sender_id] || "Unknown User"
    }));
    
    return messagesWithNames;
  } catch (error) {
    console.error("Error in fetchClientMessages:", error);
    throw error;
  }
}
