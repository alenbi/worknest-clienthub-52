
import { useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { ChatMessage as ChatMessageType } from "@/lib/firebase-chat-utils";
import { ChatMessage } from "./ChatMessage";

interface ChatMessageListProps {
  messages: ChatMessageType[];
  currentUserId: string;
  isLoading: boolean;
  emptyMessage?: string;
}

export function ChatMessageList({ 
  messages, 
  currentUserId, 
  isLoading, 
  emptyMessage = "No messages yet. Start a conversation!"
}: ChatMessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
        <span>Loading conversation...</span>
      </div>
    );
  }
  
  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">
          {emptyMessage}
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4 p-4">
      {messages.map((message) => (
        <ChatMessage
          key={message.id}
          message={message}
          isCurrentUser={message.sender_id === currentUserId}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
