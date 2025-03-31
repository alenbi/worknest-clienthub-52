import { ref, push, set, onValue, off, get, query, orderByChild, update } from "firebase/database";
import { database } from "@/integrations/firebase/config";
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
 * Subscribes to chat messages for a specific client
 */
export function subscribeToChatMessages(
  clientId: string,
  onNewMessage: MessageHandler
): () => void {
  const messagesRef = ref(database, `messages/${clientId}`);
  const messageQuery = query(messagesRef, orderByChild('created_at'));
  
  const handleNewMessage = (snapshot: any) => {
    const data = snapshot.val();
    if (!data) return;
    
    // Only process new messages (added in the last 5 seconds)
    const now = new Date();
    const fiveSecondsAgo = new Date(now.getTime() - 5000);
    
    Object.keys(data).forEach(key => {
      const message = data[key];
      const messageDate = new Date(message.created_at);
      
      if (messageDate >= fiveSecondsAgo) {
        onNewMessage({
          id: key,
          ...message,
        });
      }
    });
  };
  
  onValue(messageQuery, handleNewMessage);
  
  // Return unsubscribe function
  return () => off(messagesRef);
}

/**
 * Fetches chat messages for a client
 */
export async function fetchClientMessages(clientId: string): Promise<ChatMessage[]> {
  try {
    console.log("Fetching messages for client:", clientId);
    const messagesRef = ref(database, `messages/${clientId}`);
    const snapshot = await get(messagesRef);
    
    if (!snapshot.exists()) {
      return [];
    }
    
    const data = snapshot.val();
    
    return Object.keys(data).map(key => ({
      id: key,
      ...data[key]
    })).sort((a, b) => {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
    
  } catch (error) {
    console.error("Error fetching messages:", error);
    throw error;
  }
}

/**
 * Marks a message as read
 */
export async function markMessageAsRead(clientId: string, messageId: string): Promise<void> {
  try {
    const messageRef = ref(database, `messages/${clientId}/${messageId}`);
    await update(messageRef, { is_read: true });
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
}): Promise<ChatMessage | null> {
  try {
    // Trim message but keep it if it's only an attachment
    const finalMessage = message ? message.trim() : '';
    
    // If no message and no attachment, don't send anything
    if (!finalMessage && !attachmentUrl) {
      return null;
    }
    
    const now = new Date().toISOString();
    const id = uuidv4();
    
    const messageData = {
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
    
    const messagesRef = ref(database, `messages/${clientId}/${id}`);
    await set(messagesRef, messageData);
    
    return {
      id,
      ...messageData
    };
  } catch (error) {
    console.error("Error sending message:", error);
    toast.error("Failed to send message. Please try again.");
    throw error;
  }
}

/**
 * Uploads a file to Firebase Storage
 * Note: This is a mock implementation that returns a public placeholder URL
 * In a real implementation, you would upload to Firebase Storage
 */
export async function uploadChatFile(
  file: File,
  clientId: string,
  isAdmin: boolean
): Promise<{ url: string; type: string }> {
  try {
    // Simulate file upload with a delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate a mock URL
    const fileType = file.type.startsWith('image/') ? 'image' : 'file';
    let mockUrl = '';
    
    if (fileType === 'image') {
      mockUrl = 'https://source.unsplash.com/random/300x200';
    } else {
      mockUrl = 'https://example.com/files/document.pdf';
    }
    
    return {
      url: mockUrl,
      type: fileType
    };
  } catch (error) {
    console.error("File upload failed:", error);
    toast.error("Failed to upload file. Please try again.");
    throw error;
  }
}
