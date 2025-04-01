
import { useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { ChatMessage as ChatMessageType } from "@/lib/firebase-chat-utils";
import { ChatMessage } from "./ChatMessage";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();
  
  // Smooth scrolling to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      };
      
      // Use requestAnimationFrame for smoother scrolling
      requestAnimationFrame(scrollToBottom);
    }
  }, [messages]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin text-primary mr-2" />
        <span className="text-sm md:text-base">Loading conversation...</span>
      </div>
    );
  }
  
  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-center">
        <p className="text-sm md:text-base text-muted-foreground">
          {emptyMessage}
        </p>
      </div>
    );
  }

  // Group messages by date for better organization
  const groupedMessages = messages.reduce((groups, message) => {
    const date = new Date(message.created_at).toLocaleDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, ChatMessageType[]>);
  
  return (
    <div className="space-y-4 p-3 md:p-4">
      {Object.entries(groupedMessages).map(([date, dateMessages]) => (
        <div key={date} className="space-y-2">
          {!isMobile && (
            <div className="flex justify-center my-3">
              <div className="px-3 py-1 text-xs bg-muted rounded-full text-muted-foreground">
                {new Date(date).toLocaleDateString(undefined, { 
                  weekday: isMobile ? 'short' : 'long', 
                  month: 'short', 
                  day: 'numeric',
                  year: new Date(date).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                })}
              </div>
            </div>
          )}
          
          {dateMessages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              isCurrentUser={message.sender_id === currentUserId}
            />
          ))}
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
