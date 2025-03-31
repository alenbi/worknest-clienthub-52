
import { AdminChatList } from "@/components/admin/AdminChatList";

const AdminChat = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Client Messages</h1>
        <p className="text-muted-foreground">
          Chat with clients and provide support
        </p>
      </div>

      <div className="h-[calc(100vh-12rem)]">
        <AdminChatList />
      </div>
    </div>
  );
};

export default AdminChat;
