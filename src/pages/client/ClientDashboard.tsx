
import { useEffect, useState } from "react";
import { useClientAuth } from "@/contexts/client-auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useData } from "@/contexts/data-context";
import { CheckSquare, Clock, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const ClientDashboard = () => {
  const { user } = useClientAuth();
  const { tasks, clients } = useData();
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientTasks, setClientTasks] = useState<any[]>([]);
  const [completedTasksPercent, setCompletedTasksPercent] = useState(0);

  useEffect(() => {
    // Find the client ID based on user ID
    const fetchClientId = async () => {
      try {
        const { data } = await supabase
          .from("clients")
          .select("id")
          .eq("user_id", user?.id)
          .single();
        
        if (data) {
          setClientId(data.id);
        }
      } catch (error) {
        console.error("Error fetching client ID:", error);
      }
    };

    if (user) {
      fetchClientId();
    }
  }, [user]);

  useEffect(() => {
    // Filter tasks for this client
    if (clientId) {
      const filteredTasks = tasks.filter(task => task.clientId === clientId);
      setClientTasks(filteredTasks);
      
      // Calculate completion percentage
      const totalTasks = filteredTasks.length;
      const completedTasks = filteredTasks.filter(task => task.status === "completed").length;
      
      const percent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      setCompletedTasksPercent(percent);
    }
  }, [clientId, tasks]);

  // Count tasks by status and priority
  const completedTasksCount = clientTasks.filter(task => task.status === "completed").length;
  const pendingTasksCount = clientTasks.filter(task => task.status === "pending").length;
  const highPriorityTasksCount = clientTasks.filter(task => task.priority === "high" && task.status !== "completed").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome, {user?.name}</h1>
        <p className="text-muted-foreground">
          Here's an overview of your project progress and tasks
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientTasks.length}</div>
            <p className="text-xs text-muted-foreground">
              {completedTasksCount} completed, {pendingTasksCount} in progress
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Project Progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedTasksPercent}%</div>
            <Progress value={completedTasksPercent} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Priority Tasks</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{highPriorityTasksCount}</div>
            <p className="text-xs text-muted-foreground">
              High priority tasks that need attention
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Updates</CardTitle>
          <CardDescription>
            The latest updates on your project
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clientTasks.length > 0 ? (
            <div className="space-y-4">
              {clientTasks
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 5)
                .map((task) => (
                  <div key={task.id} className="flex items-center space-x-4 rounded-md border p-4">
                    <div>
                      {task.status === "completed" ? (
                        <CheckSquare className="h-5 w-5 text-green-500" />
                      ) : (
                        <Clock className="h-5 w-5 text-blue-500" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">{task.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {task.status === "completed" ? "Completed" : "In Progress"}
                      </p>
                    </div>
                    <div className={`rounded-full px-2 py-1 text-xs ${
                      task.priority === "high" 
                        ? "bg-red-100 text-red-800"
                        : task.priority === "medium" 
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-green-100 text-green-800"
                    }`}>
                      {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">No tasks found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientDashboard;
