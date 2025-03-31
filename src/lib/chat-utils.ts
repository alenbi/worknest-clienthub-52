import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import type { ChatMessage } from "@/lib/firebase-chat-utils";

// For compatibility, export the Firebase chat utils functions for Supabase
export type { ChatMessage };
export { 
  subscribeToChatMessages, 
  fetchClientMessages, 
  sendMessage, 
  uploadChatFile, 
  markMessageAsRead 
} from "@/lib/firebase-chat-utils";

// Supabase implementation of chat utilities
export async function fetchSupabaseClientMessages(clientId: string): Promise<ChatMessage[]> {
  try {
    const { data, error } = await supabase
      .from('client_messages')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    
    return (data || []) as ChatMessage[];
  } catch (error) {
    console.error("Error fetching messages from Supabase:", error);
    throw error;
  }
}

export async function sendSupabaseMessage({
  clientId,
  senderId,
  senderName,
  message,
  isFromClient,
  attachmentUrl = null,
  attachmentType = null
}: {
  clientId: string;
  senderId: string;
  senderName: string;
  message: string;
  isFromClient: boolean;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
}): Promise<ChatMessage> {
  try {
    // Trim message but keep it if it's only an attachment
    const finalMessage = message ? message.trim() : '';
    
    // If no message and no attachment, don't send anything
    if (!finalMessage && !attachmentUrl) {
      throw new Error("Message cannot be empty");
    }
    
    const id = uuidv4();
    const now = new Date().toISOString();
    
    const messageData = {
      id,
      client_id: clientId,
      sender_id: senderId,
      sender_name: senderName,
      is_from_client: isFromClient,
      message: finalMessage,
      attachment_url: attachmentUrl,
      attachment_type: attachmentType,
      is_read: false,
      created_at: now
    };
    
    const { error } = await supabase
      .from('client_messages')
      .insert(messageData);
    
    if (error) throw error;
    
    return messageData as ChatMessage;
  } catch (error) {
    console.error("Error sending message via Supabase:", error);
    throw error;
  }
}

export async function markSupabaseMessageAsRead(clientId: string, messageId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('client_messages')
      .update({ is_read: true })
      .match({ id: messageId, client_id: clientId });
    
    if (error) throw error;
  } catch (error) {
    console.error("Error marking message as read via Supabase:", error);
    throw error;
  }
}

export async function uploadSupabaseChatFile(
  file: File,
  clientId: string,
  isAdmin: boolean
): Promise<{ url: string; type: string }> {
  try {
    // Determine file type
    const fileType = file.type.startsWith('image/') ? 'image' : 'file';
    
    // Create a unique file path
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const prefix = isAdmin ? 'admin-attachments' : 'client-attachments';
    
    // Make sure the chat-uploads bucket exists and create the path
    const filePath = `${prefix}/${clientId}/${fileName}`;
    
    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from('chat-uploads')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) throw error;
    
    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('chat-uploads')
      .getPublicUrl(data.path);
    
    return {
      url: publicUrl,
      type: fileType
    };
  } catch (error) {
    console.error("Error uploading file to Supabase Storage:", error);
    toast.error("File upload failed. Please try again.");
    throw error;
  }
}
