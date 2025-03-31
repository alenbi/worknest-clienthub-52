import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useData, Task } from "@/contexts/data-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  ChevronLeft,
  Mail,
  Phone,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash,
  Flag,
  Edit,
} from "lucide-react";

const ClientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { clients, tasks, addTask, updateTask, deleteTask, isLoading } = useData();

  const [newTask, setNewTask] = useState<Omit<Task, "id">>({
    title: "",
    description: "",
    client_id: id || "",
    status: "pending",
    priority: "medium",
    due_date: new Date().toISOString(),
  });
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const client = clients.find((c) => c.id === id);
  
  if (!client) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <p className="text-xl">Client not found</p>
        <Button onClick={() => navigate("/clients")} variant="link">
          Return to clients
        </Button>
      </div>
    );
  }

  const clientTasks = tasks.filter((task) => task.client_id === id);
  const pendingTasks = clientTasks.filter((task) => task.status === "pending");
  const completedTasks = clientTasks.filter((task) => task.status === "completed");

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-white";
      case "medium":
        return "text-warning";
      case "low":
        return "text-info";
      default:
        return "text-muted-foreground";
    }
  };

  const getPriorityBgColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-destructive/10";
      case "medium":
        return "bg-warning/10";
      case "low":
        return "bg-info/10";
      default:
        return "bg-muted";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "text-orange-500";
      case "completed":
        return "text-success";
      default:
        return "text-muted-foreground";
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-orange-500/10";
      case "completed":
        return "bg-success/10";
      default:
        return "bg-muted";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const handleAddTask = async () => {
    try {
      await addTask(newTask);
      setNewTask({
        title: "",
        description: "",
        client_id: id || "",
        status: "pending",
        priority: "medium",
        due_date: new Date().toISOString(),
      });
      setIsAddTaskDialogOpen(false);
    } catch (error) {
      console.error("Failed to add task:", error);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: "pending" | "completed") => {
    try {
      await updateTask(taskId, { status: newStatus });
      toast.success(`Task marked as ${newStatus}`);
    } catch (error) {
      console.error("Failed to update task:", error);
      toast.error("Failed to update task status");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
    } catch (error) {
      console.error("Failed to delete task:", error);
      toast.error("Failed to delete task");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" onClick={() => navigate("/clients")} className="mr-2">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">Client Details</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-20 w-20">
                <AvatarImage src={client.avatar} alt={client.name} />
                <AvatarFallback>{getInitials(client.name)}</AvatarFallback>
              </Avatar>
              <CardTitle className="mt-4">{client.name}</CardTitle>
              <CardDescription>{client.company}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center">
              <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>{client.email}</span>
            </div>
            <div className="flex items-center">
              <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>{client.phone}</span>
            </div>
            <div className="flex items-center">
              <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>{client.company}</span>
            </div>
            <div className="flex items-center">
              <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>Client since {format(new Date(client.created_at || Date.now()), "MMM d, yyyy")}</span>
            </div>
            
            <div className="mt-6 pt-4 border-t">
              <h3 className="mb-2 font-medium">Task Summary</h3>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-md bg-orange-500/10 p-2">
                  <span className="block text-lg font-medium">{pendingTasks.length}</span>
                  <span className="text-xs text-muted-foreground">Pending</span>
                </div>
                <div className="rounded-md bg-success/10 p-2">
                  <span className="block text-lg font-medium">{completedTasks.length}</span>
                  <span className="text-xs text-muted-foreground">Completed</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Tasks</CardTitle>
              <CardDescription>Manage tasks for {client.name}</CardDescription>
            </div>
            <Dialog open={isAddTaskDialogOpen} onOpenChange={setIsAddTaskDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Task
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Task</DialogTitle>
                  <DialogDescription>
                    Create a new task for {client.name}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label htmlFor="title" className="text-sm font-medium">
                      Title
                    </label>
                    <Input
                      id="title"
                      placeholder="Task title"
                      value={newTask.title}
                      onChange={(e) =>
                        setNewTask((prev) => ({ ...prev, title: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="description" className="text-sm font-medium">
                      Description
                    </label>
                    <Textarea
                      id="description"
                      placeholder="Task description"
                      value={newTask.description}
                      onChange={(e) =>
                        setNewTask((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="priority" className="text-sm font-medium">
                        Priority
                      </label>
                      <Select
                        value={newTask.priority}
                        onValueChange={(value: "low" | "medium" | "high") =>
                          setNewTask((prev) => ({ ...prev, priority: value }))
                        }
                      >
                        <SelectTrigger id="priority">
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
                      <label htmlFor="dueDate" className="text-sm font-medium">
                        Due Date
                      </label>
                      <Input
                        id="dueDate"
                        type="date"
                        value={format(new Date(newTask.due_date), "yyyy-MM-dd")}
                        onChange={(e) =>
                          setNewTask((prev) => ({
                            ...prev,
                            due_date: new Date(e.target.value).toISOString(),
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsAddTaskDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleAddTask}>Add Task</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList className="mb-4 grid w-full grid-cols-3">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all" className="space-y-4">
                {clientTasks.length > 0 ? (
                  clientTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onUpdateStatus={handleUpdateTaskStatus}
                      onDelete={handleDeleteTask}
                      getStatusColor={getStatusColor}
                      getStatusBgColor={getStatusBgColor}
                      getPriorityColor={getPriorityColor}
                      getPriorityBgColor={getPriorityBgColor}
                    />
                  ))
                ) : (
                  <div className="flex h-40 flex-col items-center justify-center rounded-lg border border-dashed">
                    <p className="text-lg font-medium">No tasks found</p>
                    <p className="text-sm text-muted-foreground">
                      Add a task to get started
                    </p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="pending" className="space-y-4">
                {pendingTasks.length > 0 ? (
                  pendingTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onUpdateStatus={handleUpdateTaskStatus}
                      onDelete={handleDeleteTask}
                      getStatusColor={getStatusColor}
                      getStatusBgColor={getStatusBgColor}
                      getPriorityColor={getPriorityColor}
                      getPriorityBgColor={getPriorityBgColor}
                    />
                  ))
                ) : (
                  <div className="flex h-40 flex-col items-center justify-center rounded-lg border border-dashed">
                    <p className="text-lg font-medium">No pending tasks</p>
                    <p className="text-sm text-muted-foreground">
                      All tasks are completed
                    </p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="completed" className="space-y-4">
                {completedTasks.length > 0 ? (
                  completedTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onUpdateStatus={handleUpdateTaskStatus}
                      onDelete={handleDeleteTask}
                      getStatusColor={getStatusColor}
                      getStatusBgColor={getStatusBgColor}
                      getPriorityColor={getPriorityColor}
                      getPriorityBgColor={getPriorityBgColor}
                    />
                  ))
                ) : (
                  <div className="flex h-40 flex-col items-center justify-center rounded-lg border border-dashed">
                    <p className="text-lg font-medium">No completed tasks</p>
                    <p className="text-sm text-muted-foreground">
                      Complete some tasks to see them here
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

interface TaskCardProps {
  task: Task;
  onUpdateStatus: (id: string, status: "pending" | "completed") => void;
  onDelete: (id: string) => void;
  getStatusColor: (status: string) => string;
  getStatusBgColor: (status: string) => string;
  getPriorityColor: (priority: string) => string;
  getPriorityBgColor: (priority: string) => string;
}

const TaskCard = ({
  task,
  onUpdateStatus,
  onDelete,
  getStatusColor,
  getStatusBgColor,
  getPriorityColor,
  getPriorityBgColor,
}: TaskCardProps) => {
  const isOverdue =
    task.status !== "completed" && new Date(task.due_date) < new Date();

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/50 p-4">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{task.title}</CardTitle>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2 py-1 text-xs ${getStatusBgColor(
                  task.status
                )} ${getStatusColor(task.status)}`}
              >
                {task.status === "pending" ? "Pending" : "Completed"}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2 py-1 text-xs ${getPriorityBgColor(
                  task.priority
                )} ${getPriorityColor(task.priority)}`}
              >
                <Flag className="mr-1 h-3 w-3" />
                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2 py-1 text-xs ${
                  isOverdue
                    ? "bg-destructive/10 text-destructive"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isOverdue ? (
                  <AlertTriangle className="mr-1 h-3 w-3" />
                ) : (
                  <Clock className="mr-1 h-3 w-3" />
                )}
                {format(new Date(task.due_date), "MMM d, yyyy")}
              </span>
            </div>
          </div>
          <div className="flex space-x-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onDelete(task.id)}
            >
              <Trash className="h-4 w-4" />
              <span className="sr-only">Delete</span>
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Edit className="h-4 w-4" />
              <span className="sr-only">Edit</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <p className="text-sm">{task.description}</p>
        
        {task.status !== "completed" && (
          <div className="mt-4 flex space-x-2">
            <Button
              size="sm"
              onClick={() => onUpdateStatus(task.id, "completed")}
              variant="outline"
              className="text-success"
            >
              <CheckCircle2 className="mr-1 h-4 w-4" />
              Complete
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClientDetail;
