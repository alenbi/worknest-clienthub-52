import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";
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
 * Subscribe to chat messages for a client
 */
export function subscribeToChatChannel(
  clientId: string,
  isAdmin: boolean,
  onNewMessage: MessageHandler
) {
  console.log("Setting up message subscription for client:", clientId);
  
  const channel = supabase
    .channel(`client_chat_${clientId}`)
    .on('postgres_changes', 
      { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'client_messages',
        filter: `client_id=eq.${clientId}`
      }, 
      (payload) => {
        console.log("New message received:", payload);
        const newMessage = payload.new as ChatMessage;
        onNewMessage(newMessage);
      })
    .subscribe();
  
  return channel;
}

/**
 * Fetch messages for a client
 */
export async function fetchClientMessages(clientId: string): Promise<ChatMessage[]> {
  console.log("Fetching messages for client:", clientId);
  
  try {
    const { data, error } = await supabase
      .from("client_messages")
      .select(`
        id,
        message, 
        sender_id, 
        client_id, 
        is_from_client, 
        created_at, 
        is_read,
        attachment_url,
        attachment_type
      `)
      .eq("client_id", clientId)
      .order("created_at", { ascending: true });
    
    if (error) {
      console.error("Error fetching messages:", error);
      throw error;
    }

    console.log("Messages fetched:", data?.length || 0);
    return data || [];
  } catch (error) {
    console.error("Error in fetchClientMessages:", error);
    throw error;
  }
}

/**
 * Send a message
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
    
    const { data, error } = await supabase
      .from("client_messages")
      .insert({
        client_id: clientId,
        sender_id: senderId,
        message: finalMessage,
        is_from_client: isFromClient,
        attachment_url: attachmentUrl,
        attachment_type: attachmentType,
        is_read: false
      })
      .select()
      .single();
    
    if (error) {
      console.error("Error sending message:", error);
      throw error;
    }
    
    console.log("Message sent successfully");
    
    // Send email notification
    await sendMessageNotification(clientId, senderId, message, isFromClient);
    
    return data as ChatMessage;
  } catch (error) {
    console.error("Error in sendMessage:", error);
    toast.error("Failed to send message. Please try again.");
    throw error;
  }
}

/**
 * Mark a message as read
 */
export async function markMessageAsRead(messageId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from("client_messages")
      .update({ is_read: true })
      .eq("id", messageId);
    
    if (error) {
      console.error("Error marking message as read:", error);
    }
  } catch (error) {
    console.error("Error in markMessageAsRead:", error);
  }
}

/**
 * Upload a file for chat attachment
 */
export async function uploadChatFile(
  file: File, 
  clientId: string,
  isAdmin: boolean
): Promise<{ url: string; type: string }> {
  try {
    // Check if bucket exists, create it if not
    const { data: buckets } = await supabase.storage.listBuckets();
    const chatBucket = buckets?.find(b => b.name === 'chat_attachments');
    
    if (!chatBucket) {
      const { error: bucketError } = await supabase.storage
        .createBucket('chat_attachments', { public: true });
      
      if (bucketError) throw bucketError;
    }
    
    // Determine file type
    const fileType = file.type.startsWith('image/') ? 'image' : 'file';
    
    // Create a unique file path
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const prefix = isAdmin ? 'admin-attachments' : 'client-attachments';
    const filePath = `${prefix}/${clientId}/${fileName}`;
    
    // Upload file to storage
    const { error: uploadError } = await supabase.storage
      .from('chat_attachments')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });
    
    if (uploadError) throw uploadError;
    
    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('chat_attachments')
      .getPublicUrl(filePath);
    
    return {
      url: publicUrl,
      type: fileType
    };
  } catch (error) {
    console.error("File upload failed:", error);
    toast.error("Failed to upload file. Please try again.");
    throw error;
  }
}

/**
 * Send an email notification about a new message
 */
async function sendMessageNotification(
  clientId: string,
  senderId: string,
  message: string,
  isFromClient: boolean
): Promise<void> {
  try {
    // Get client details
    const { data: clientData, error: clientError } = await supabase
      .from("clients")
      .select("name, email")
      .eq("id", clientId)
      .single();
    
    if (clientError || !clientData) {
      console.error("Client not found for notification:", clientError);
      return;
    }
    
    // Get sender name if admin
    let senderName = "Digital Shopi";
    if (!isFromClient && senderId) {
      const { data: userData } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", senderId)
        .single();
        
      if (userData?.full_name) {
        senderName = userData.full_name;
      }
    }
    
    // Prepare notification data
    const notificationData = {
      clientId,
      clientName: clientData.name,
      clientEmail: clientData.email,
      senderName,
      message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
      isFromClient
    };
    
    // Send the notification to our function
    await supabase.functions.invoke('send-message-notification', {
      body: notificationData
    });
    
    console.log("Message notification sent");
  } catch (error) {
    console.error("Failed to send message notification:", error);
    // Don't throw here - this is a non-essential operation
  }
}
