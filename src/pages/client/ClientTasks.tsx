
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { useClientAuth } from "@/contexts/client-auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Task, TaskStatus } from "@/lib/models";

const statusColors: Record<TaskStatus, string> = {
  [TaskStatus.TODO]: "bg-gray-100 text-gray-800",
  [TaskStatus.IN_PROGRESS]: "bg-blue-100 text-blue-800",
  [TaskStatus.COMPLETED]: "bg-green-100 text-green-800",
  [TaskStatus.BLOCKED]: "bg-red-100 text-red-800"
};

const statusLabels: Record<TaskStatus, string> = {
  [TaskStatus.TODO]: "To Do",
  [TaskStatus.IN_PROGRESS]: "In Progress",
  [TaskStatus.COMPLETED]: "Completed",
  [TaskStatus.BLOCKED]: "Blocked"
};

const ClientTasks = () => {
  const { user } = useClientAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState<string | null>(null);

  // Get clientId from user
  useEffect(() => {
    const fetchClientId = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from("clients")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (error) throw error;
        setClientId(data?.id || null);
      } catch (error) {
        console.error("Error fetching client ID:", error);
        toast.error("Could not load client profile");
      }
    };

    fetchClientId();
  }, [user]);

  // Fetch tasks once we have clientId
  useEffect(() => {
    const fetchTasks = async () => {
      if (!clientId) return;

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("tasks")
          .select("*")
          .eq("client_id", clientId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setTasks(data as Task[]);
      } catch (error) {
        console.error("Error fetching tasks:", error);
        toast.error("Failed to load tasks");
      } finally {
        setLoading(false);
      }
    };

    if (clientId) {
      fetchTasks();
    }
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!clientId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Client profile not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
        <p className="text-muted-foreground">
          View your current tasks and their status
        </p>
      </div>

      {tasks.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <p>No tasks assigned to you at the moment.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <Card key={task.id} className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-medium">{task.title}</h3>
                <Badge className={statusColors[task.status as TaskStatus]}>
                  {statusLabels[task.status as TaskStatus]}
                </Badge>
              </div>
              {task.description && <p className="text-muted-foreground mb-4">{task.description}</p>}
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>Created: {format(new Date(task.created_at), "MMM d, yyyy")}</span>
                {task.due_date && (
                  <span>Due: {format(new Date(task.due_date), "MMM d, yyyy")}</span>
                )}
                {task.completed_at && (
                  <span>Completed: {format(new Date(task.completed_at), "MMM d, yyyy")}</span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientTasks;
