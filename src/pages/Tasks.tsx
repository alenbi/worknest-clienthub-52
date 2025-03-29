
import { useState } from "react";
import { Link } from "react-router-dom";
import { useData, Task } from "@/contexts/data-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { format, isAfter, isBefore, isToday, startOfToday } from "date-fns";
import {
  Search,
  Plus,
  MoreHorizontal,
  Clock,
  CalendarIcon,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  Trash,
  Edit,
  FilterX,
} from "lucide-react";

const Tasks = () => {
  const { clients, tasks, addTask, updateTask, deleteTask, isLoading } = useData();
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState<Omit<Task, "id" | "createdAt" | "completedAt">>({
    title: "",
    description: "",
    clientId: "",
    status: "todo",
    priority: "medium",
    dueDate: new Date(),
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const filteredTasks = tasks.filter((task) => {
    // Search filter
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase() || "");

    // Priority filter
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;

    // Client filter
    const matchesClient = clientFilter === "all" || task.clientId === clientFilter;

    return matchesSearch && matchesPriority && matchesClient;
  });

  // Sort tasks by creation date (newest last)
  const sortByCreatedAt = (taskList: Task[]) => {
    return [...taskList].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  };

  const todoTasks = sortByCreatedAt(filteredTasks.filter((task) => task.status === "todo"));
  const inProgressTasks = sortByCreatedAt(filteredTasks.filter((task) => task.status === "in-progress"));
  const completedTasks = sortByCreatedAt(filteredTasks.filter((task) => task.status === "completed"));

  const getClientName = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    return client ? client.name : "Unknown Client";
  };

  const resetFilters = () => {
    setPriorityFilter("all");
    setClientFilter("all");
    setSearchQuery("");
  };

  const handleAddTask = async () => {
    try {
      await addTask(newTask);
      setNewTask({
        title: "",
        description: "",
        clientId: "",
        status: "todo",
        priority: "medium",
        dueDate: new Date(),
      });
      setIsAddTaskDialogOpen(false);
    } catch (error) {
      console.error("Failed to add task:", error);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: "todo" | "in-progress" | "completed") => {
    try {
      await updateTask(taskId, { status: newStatus });
    } catch (error) {
      console.error("Failed to update task:", error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-destructive";
      case "medium":
        return "text-warning";
      case "low":
        return "text-info";
      default:
        return "text-muted-foreground";
    }
  };

  // Task component with numbering
  const TaskItem = ({ task, index, status }: { task: Task; index: number; status: string }) => (
    <div
      key={task.id}
      className="group relative rounded-lg border p-4 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
        {index + 1}
      </div>
      
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          {status !== "completed" ? (
            <Checkbox
              id={`task-${task.id}`}
              checked={status === "completed"}
              onCheckedChange={() => 
                handleUpdateTaskStatus(
                  task.id, 
                  status === "todo" ? "in-progress" : "completed"
                )
              }
            />
          ) : (
            <Checkbox
              id={`task-${task.id}`}
              checked={true}
              disabled
            />
          )}
          <div>
            <div className="flex items-center">
              <h3 className={`font-medium ${status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                {task.title}
              </h3>
              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${getPriorityColor(task.priority)} bg-opacity-10`}>
                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{task.description}</p>
            
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Link
                to={`/clients/${task.clientId}`}
                className="flex items-center hover:text-primary"
              >
                <ArrowUpRight className="mr-1 h-3 w-3" />
                {getClientName(task.clientId)}
              </Link>
              
              <span className="flex items-center">
                <CalendarIcon className="mr-1 h-3 w-3" />
                Due: {format(new Date(task.dueDate), "MMM d, yyyy")}
              </span>
              
              {isBefore(new Date(task.dueDate), startOfToday()) && status !== "completed" && (
                <span className="flex items-center text-destructive">
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  Overdue
                </span>
              )}
              
              {isToday(new Date(task.dueDate)) && status !== "completed" && (
                <span className="flex items-center text-warning">
                  <Clock className="mr-1 h-3 w-3" />
                  Due today
                </span>
              )}
              
              {task.completedAt && (
                <span className="flex items-center text-success">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Completed: {format(new Date(task.completedAt), "MMM d, yyyy")}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {status === "todo" && (
              <>
                <DropdownMenuItem
                  onClick={() => handleUpdateTaskStatus(task.id, "in-progress")}
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Start Task
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleUpdateTaskStatus(task.id, "completed")}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Mark Complete
                </DropdownMenuItem>
              </>
            )}
            
            {status === "in-progress" && (
              <>
                <DropdownMenuItem
                  onClick={() => handleUpdateTaskStatus(task.id, "todo")}
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Move to To-Do
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleUpdateTaskStatus(task.id, "completed")}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Mark Complete
                </DropdownMenuItem>
              </>
            )}
            
            {status === "completed" && (
              <DropdownMenuItem
                onClick={() => handleUpdateTaskStatus(task.id, "todo")}
              >
                <Clock className="mr-2 h-4 w-4" />
                Reopen as To-Do
              </DropdownMenuItem>
            )}
            
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleDeleteTask(task.id)}
              className="text-destructive"
            >
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between space-y-4 md:flex-row md:items-center md:space-y-0">
        <h2 className="text-3xl font-bold tracking-tight">Tasks</h2>
        <div className="flex flex-wrap gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search tasks..."
              className="w-full pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Dialog open={isAddTaskDialogOpen} onOpenChange={setIsAddTaskDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Task</DialogTitle>
                <DialogDescription>
                  Fill in the details to create a new task
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
                  <label htmlFor="client" className="text-sm font-medium">
                    Client
                  </label>
                  <Select
                    value={newTask.clientId}
                    onValueChange={(value) =>
                      setNewTask((prev) => ({ ...prev, clientId: value }))
                    }
                  >
                    <SelectTrigger id="client">
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                      value={format(new Date(newTask.dueDate), "yyyy-MM-dd")}
                      onChange={(e) =>
                        setNewTask((prev) => ({
                          ...prev,
                          dueDate: new Date(e.target.value),
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
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select
          value={priorityFilter}
          onValueChange={setPriorityFilter}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="high">High Priority</SelectItem>
            <SelectItem value="medium">Medium Priority</SelectItem>
            <SelectItem value="low">Low Priority</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={clientFilter}
          onValueChange={setClientFilter}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by client" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(priorityFilter !== "all" || clientFilter !== "all" || searchQuery) && (
          <Button variant="ghost" onClick={resetFilters} className="h-10">
            <FilterX className="mr-2 h-4 w-4" />
            Reset filters
          </Button>
        )}
      </div>

      <Tabs defaultValue="todo">
        <TabsList className="mb-4 grid w-full grid-cols-3">
          <TabsTrigger value="todo">To-Do ({todoTasks.length})</TabsTrigger>
          <TabsTrigger value="in-progress">In Progress ({inProgressTasks.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedTasks.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="todo" className="space-y-4">
          {todoTasks.length > 0 ? (
            todoTasks.map((task, index) => (
              <TaskItem key={task.id} task={task} index={index} status="todo" />
            ))
          ) : (
            <div className="flex h-40 flex-col items-center justify-center rounded-lg border border-dashed">
              <p className="text-lg font-medium">No to-do tasks found</p>
              <p className="text-sm text-muted-foreground">
                {searchQuery || priorityFilter !== "all" || clientFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Add a task to get started"}
              </p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="in-progress" className="space-y-4">
          {inProgressTasks.length > 0 ? (
            inProgressTasks.map((task, index) => (
              <TaskItem key={task.id} task={task} index={index} status="in-progress" />
            ))
          ) : (
            <div className="flex h-40 flex-col items-center justify-center rounded-lg border border-dashed">
              <p className="text-lg font-medium">No in-progress tasks found</p>
              <p className="text-sm text-muted-foreground">
                {searchQuery || priorityFilter !== "all" || clientFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Start a task to see it here"}
              </p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="completed" className="space-y-4">
          {completedTasks.length > 0 ? (
            completedTasks.map((task, index) => (
              <TaskItem key={task.id} task={task} index={index} status="completed" />
            ))
          ) : (
            <div className="flex h-40 flex-col items-center justify-center rounded-lg border border-dashed">
              <p className="text-lg font-medium">No completed tasks found</p>
              <p className="text-sm text-muted-foreground">
                {searchQuery || priorityFilter !== "all" || clientFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Complete a task to see it here"}
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Tasks;
