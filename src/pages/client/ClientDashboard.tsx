
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Clock, AlertTriangle, ListTodo, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClientAuth } from "@/contexts/client-auth-context";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const ClientDashboard = () => {
  const { user } = useClientAuth();
  const [clientId, setClientId] = useState<string | null>(null);
  const [taskStats, setTaskStats] = useState({
    completed: 0,
    pending: 0,
    overdue: 0,
    total: 0
  });
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [clientName, setClientName] = useState(user?.name || "Client");

  // Fetch client ID based on user ID
  useEffect(() => {
    const fetchClientId = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from("clients")
          .select("id, name")
          .eq("user_id", user.id)
          .single();
        
        if (error) throw error;
        
        if (data) {
          setClientId(data.id);
          if (data.name) setClientName(data.name);
        }
      } catch (error) {
        console.error("Error fetching client ID:", error);
      }
    };

    if (user) {
      fetchClientId();
    }
  }, [user]);

  // Fetch client data (tasks and messages)
  useEffect(() => {
    const fetchClientData = async () => {
      if (!clientId) return;

      setIsLoading(true);
      try {
        // Get tasks stats
        const today = new Date().toISOString();
        
        // Get all tasks for this client
        const { data: tasksData, error: tasksError } = await supabase
          .from("tasks")
          .select("*")
          .eq("client_id", clientId);

        if (tasksError) throw tasksError;
        
        const tasks = tasksData || [];
        const completedTasks = tasks.filter(task => task.status === 'completed');
        const pendingTasks = tasks.filter(task => task.status === 'pending');
        const overdueTasks = pendingTasks.filter(task => new Date(task.due_date) < new Date());
        
        setTaskStats({
          completed: completedTasks.length,
          pending: pendingTasks.length,
          overdue: overdueTasks.length,
          total: tasks.length
        });

        // Get recent tasks
        const sortedTasks = [...tasks].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setRecentTasks(sortedTasks.slice(0, 5));

        // Get unread messages count
        const { count: unreadCount, error: messagesError } = await supabase
          .from("client_messages")
          .select("*", { count: "exact", head: true })
          .eq("client_id", clientId)
          .eq("is_from_client", false)
          .eq("is_read", false);

        if (messagesError) throw messagesError;
        setUnreadMessages(unreadCount || 0);

      } catch (error) {
        console.error("Error fetching client data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClientData();
  }, [clientId]);

  // Prepare data for chart
  const chartData = [
    { name: "Completed", value: taskStats.completed, color: "#10b981" },
    { name: "In Progress", value: taskStats.pending - taskStats.overdue, color: "#3b82f6" },
    { name: "Overdue", value: taskStats.overdue, color: "#ef4444" },
  ].filter(item => item.value > 0);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome, {clientName}
        </h1>
        <p className="text-muted-foreground">
          Here's an overview of your project status
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taskStats.total}</div>
            <p className="text-xs text-muted-foreground">
              Tasks assigned to you
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taskStats.completed}</div>
            <p className="text-xs text-muted-foreground">
              Tasks you've completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taskStats.pending}</div>
            <p className="text-xs text-muted-foreground">
              Tasks in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taskStats.overdue}</div>
            <p className="text-xs text-muted-foreground">
              Tasks past due date
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {taskStats.total > 0 ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Task Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => 
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Task Overview</CardTitle>
            </CardHeader>
            <CardContent className="flex h-[250px] items-center justify-center text-muted-foreground">
              No tasks assigned yet
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Recent Activities</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTasks.length > 0 ? (
              <div className="space-y-4">
                {recentTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div>
                      <div className="font-medium">{task.title}</div>
                      <div className="text-sm text-muted-foreground">
                        Status: {task.status === "completed" ? "Completed" : "In Progress"}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {task.due_date && format(new Date(task.due_date), "MMM d")}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-[200px] items-center justify-center rounded-md border border-dashed">
                <p className="text-sm text-muted-foreground">
                  No recent tasks
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {unreadMessages > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center">
              <MessageSquare className="h-5 w-5 mr-2 text-primary" />
              <span>You have {unreadMessages} unread message{unreadMessages > 1 ? 's' : ''}</span>
            </div>
            <Button size="sm" variant="outline" onClick={() => window.location.href = '/client/chat'}>
              View Messages
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClientDashboard;
