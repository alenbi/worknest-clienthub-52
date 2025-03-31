
import { useState, useEffect } from "react";
import { useClientAuth } from "@/contexts/client-auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, AlertTriangle, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  created_at: string;
  due_date: string;
  completed_at: string | null;
}

const ClientTasks = () => {
  const { user } = useClientAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  // Function to get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-500 text-white">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-blue-500 text-white">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case 'overdue':
        return (
          <Badge className="bg-red-500 text-white">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Overdue
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {status}
          </Badge>
        );
    }
  };

  // Get priority badge
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge className="bg-red-500 text-white">High</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500 text-white">Medium</Badge>;
      case 'low':
        return <Badge className="bg-green-500 text-white">Low</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  // Get client ID
  useEffect(() => {
    const getClientId = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from("clients")
          .select("id")
          .eq("user_id", user.id)
          .single();
        
        if (error) throw error;
        
        if (data) {
          setClientId(data.id);
        }
      } catch (error) {
        console.error("Error fetching client ID:", error);
        toast.error("Failed to load client profile");
      }
    };
    
    getClientId();
  }, [user]);

  // Fetch tasks
  useEffect(() => {
    const fetchTasks = async () => {
      if (!clientId) return;
      
      try {
        setIsLoading(true);
        
        const { data, error } = await supabase
          .from("tasks")
          .select("*")
          .eq("client_id", clientId)
          .order("due_date", { ascending: true });
        
        if (error) throw error;
        
        // Process tasks and check if any are overdue
        const processedTasks = (data || []).map(task => {
          // If task is not completed and due date is past, mark as overdue
          if (task.status !== "completed" && new Date(task.due_date) < new Date()) {
            return { ...task, status: "overdue" };
          }
          return task;
        });
        
        setTasks(processedTasks);
      } catch (error) {
        console.error("Error fetching tasks:", error);
        toast.error("Failed to load tasks");
      } finally {
        setIsLoading(false);
      }
    };
    
    if (clientId) {
      fetchTasks();
    }
  }, [clientId]);

  // Filter tasks based on active tab
  const filteredTasks = tasks.filter(task => {
    if (activeTab === "all") return true;
    if (activeTab === "completed") return task.status === "completed";
    if (activeTab === "pending") return task.status === "pending";
    if (activeTab === "overdue") return task.status === "overdue";
    return true;
  });

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Please log in to view your tasks</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Your Tasks</h1>
        <p className="text-muted-foreground">
          View and manage your project tasks
        </p>
      </div>

      <Tabs 
        defaultValue="all" 
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid grid-cols-4 w-full max-w-md">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          {isLoading ? (
            <div className="flex justify-center p-12">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : filteredTasks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="rounded-full bg-muted p-3 mb-4">
                  <Clock className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">No tasks found</h3>
                <p className="text-sm text-muted-foreground text-center max-w-md mt-2">
                  {activeTab === "all" 
                    ? "You don't have any tasks assigned yet." 
                    : `You don't have any ${activeTab} tasks.`}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredTasks.map((task) => (
                <Card key={task.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle>{task.title}</CardTitle>
                      <div className="flex space-x-2">
                        {getPriorityBadge(task.priority)}
                        {getStatusBadge(task.status)}
                      </div>
                    </div>
                    <CardDescription>
                      <div className="flex items-center text-sm mt-1">
                        <CalendarIcon className="h-3 w-3 mr-1" />
                        Due: {format(new Date(task.due_date), "MMM d, yyyy")}
                      </div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {task.description && (
                      <p className="text-sm text-muted-foreground mb-4">
                        {task.description}
                      </p>
                    )}
                    
                    {task.status === "completed" && task.completed_at && (
                      <div className="text-sm text-muted-foreground">
                        Completed on {format(new Date(task.completed_at), "MMM d, yyyy")}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Tabs>
    </div>
  );
};

export default ClientTasks;
