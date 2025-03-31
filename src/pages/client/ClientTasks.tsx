import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useClientAuth } from "@/contexts/client-auth-context";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { CheckCircle, Clock, AlertTriangle, Plus, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const ClientTasks = () => {
  const { user } = useClientAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<any[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [openNewTaskDialog, setOpenNewTaskDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium",
    dueDate: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
  });

  // Handle task creation dialog based on location state
  useEffect(() => {
    if (location.state?.openNewTask) {
      setOpenNewTaskDialog(true);
      // Clean up the state
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  // Fetch client ID based on user ID
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
        
        if (data) {
          setClientId(data.id);
        }
      } catch (error) {
        console.error("Error fetching client ID:", error);
        toast.error("Failed to load your profile");
      }
    };

    if (user) {
      fetchClientId();
    }
  }, [user]);

  // Fetch tasks based on client ID
  useEffect(() => {
    const fetchTasks = async () => {
      if (!clientId) return;

      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from("tasks")
          .select("*")
          .eq("client_id", clientId)
          .order("created_at", { ascending: false });
        
        if (error) throw error;
        
        setTasks(data || []);
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

  const handleSubmitNewTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!clientId) {
      toast.error("Client profile not found");
      return;
    }
    
    if (!newTask.title || !newTask.priority || !newTask.dueDate) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const taskToCreate = {
        title: newTask.title,
        description: newTask.description,
        priority: newTask.priority,
        client_id: clientId,
        status: "pending",
        due_date: new Date(newTask.dueDate).toISOString(),
      };
      
      const { error, data } = await supabase
        .from("tasks")
        .insert(taskToCreate)
        .select();
      
      if (error) throw error;
      
      // Add the new task to the list
      if (data && data[0]) {
        setTasks([data[0], ...tasks]);
      }
      
      // Reset form and close dialog
      setNewTask({
        title: "",
        description: "",
        priority: "medium",
        dueDate: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
      });
      
      setOpenNewTaskDialog(false);
      toast.success("Task created successfully");
      
    } catch (error: any) {
      console.error("Error creating task:", error);
      toast.error(error.message || "Failed to create task");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter tasks based on active tab
  const filteredTasks = tasks.filter((task) => {
    switch (activeTab) {
      case "completed":
        return task.status === "completed";
      case "pending":
        return task.status === "pending";
      case "overdue":
        return task.status === "pending" && new Date(task.due_date) < new Date();
      default:
        return true;
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
        <span>Loading tasks...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Tasks</h1>
          <p className="text-muted-foreground">
            View and manage your project tasks
          </p>
        </div>
        <Button onClick={() => setOpenNewTaskDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Task
        </Button>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Tasks</TabsTrigger>
          <TabsTrigger value="pending">In Progress</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          {filteredTasks.length > 0 ? (
            <div className="space-y-4">
              {filteredTasks.map((task) => (
                <Card key={task.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="mt-1">
                          {task.status === "completed" ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : new Date(task.due_date) < new Date() ? (
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                          ) : (
                            <Clock className="h-5 w-5 text-blue-500" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium text-lg">{task.title}</h3>
                          {task.description && (
                            <p className="text-muted-foreground mt-1">{task.description}</p>
                          )}
                          <div className="flex gap-2 mt-2">
                            <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs ${
                              task.priority === "high" 
                                ? "bg-red-100 text-red-700" 
                                : task.priority === "medium"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-blue-100 text-blue-700"
                            }`}>
                              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
                            </span>
                            <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs ${
                              task.status === "completed"
                                ? "bg-green-100 text-green-700"
                                : "bg-blue-100 text-blue-700"
                            }`}>
                              {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Due: {format(new Date(task.due_date), "MMM d, yyyy")}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 rounded-md border border-dashed">
              <div className="text-center">
                <p className="text-muted-foreground">No tasks found</p>
                <Button 
                  variant="outline" 
                  onClick={() => setOpenNewTaskDialog(true)}
                  className="mt-4"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create a New Task
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={openNewTaskDialog} onOpenChange={setOpenNewTaskDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>New Task Request</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitNewTask}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Task Title</Label>
                <Input
                  id="title"
                  placeholder="Enter task title"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what you need help with"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={newTask.priority}
                    onValueChange={(value) => setNewTask({ ...newTask, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    min={format(new Date(), "yyyy-MM-dd")}
                    required
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenNewTaskDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Task"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientTasks;
