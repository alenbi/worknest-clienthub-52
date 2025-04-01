
import React, { memo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { ChatMessage } from '@/lib/firebase-chat-utils';
import { FileText, Image as ImageIcon, FileIcon, ExternalLink } from 'lucide-react';

interface ChatMessageProps {
  message: ChatMessage;
  isCurrentUser: boolean;
}

// Memoize the FilePreview component to prevent unnecessary re-renders
const FilePreview = memo(({ url, type }: { url: string; type: string }) => {
  if (type.startsWith('image/')) {
    return (
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="block mt-2"
      >
        <div className="relative">
          <img 
            src={url} 
            alt="Attachment" 
            className="max-w-full max-h-40 rounded border object-cover" 
            loading="lazy" // Add lazy loading
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder.svg';
            }}
          />
          <div className="absolute bottom-1 right-1">
            <ExternalLink className="h-4 w-4 text-white drop-shadow-md" />
          </div>
        </div>
      </a>
    );
  }
  
  return (
    <a 
      href={url} 
      target="_blank" 
      rel="noopener noreferrer"
      className="flex items-center text-xs underline mt-2 hover:text-primary transition-colors"
    >
      {type.includes('pdf') ? (
        <FileText className="h-4 w-4 mr-1" />
      ) : type.includes('image') ? (
        <ImageIcon className="h-4 w-4 mr-1" />
      ) : (
        <FileIcon className="h-4 w-4 mr-1" />
      )}
      <span className="truncate max-w-[200px]">
        {url.split('/').pop() || 'Attachment'}
      </span>
    </a>
  );
});

// Optimize the component with memo to prevent unnecessary re-renders
const ChatMessageComponent = ({ message, isCurrentUser }: ChatMessageProps) => {
  const initial = message.sender_name ? message.sender_name[0] : (isCurrentUser ? 'Y' : 'O');
  
  const displayName = message.sender_name || (isCurrentUser ? 'You' : 'Other');
  
  const formattedTime = new Date(message.created_at).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true
  });
  
  return (
    <div className={cn(
      "flex w-full mb-4 items-start",
      isCurrentUser ? "justify-end" : "justify-start"
    )}>
      {!isCurrentUser && (
        <Avatar className="h-8 w-8 mr-2">
          <AvatarImage src={message.sender_id === 'system' ? '/logo.svg' : undefined} alt={displayName} />
          <AvatarFallback>{initial}</AvatarFallback>
        </Avatar>
      )}
      
      <div className={cn(
        "max-w-[80%] rounded-lg px-4 py-2",
        isCurrentUser ? "bg-primary text-primary-foreground" : "bg-muted"
      )}>
        <div className="text-xs mb-1">{displayName}</div>
        
        {message.message && (
          <p className="text-sm whitespace-pre-wrap break-words">{message.message}</p>
        )}
        
        {message.attachment_url && message.attachment_type && (
          <div className="mt-2">
            <FilePreview url={message.attachment_url} type={message.attachment_type} />
          </div>
        )}
        
        <div className="text-xs opacity-70 mt-1">
          {formattedTime}
          {message.is_read && isCurrentUser && (
            <span className="ml-2">✓</span>
          )}
        </div>
      </div>
      
      {isCurrentUser && (
        <Avatar className="h-8 w-8 ml-2">
          <AvatarImage alt={displayName} />
          <AvatarFallback>{initial}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};

export { ChatMessageComponent };
