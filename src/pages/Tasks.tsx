import { useState } from "react";
import { format } from "date-fns";
import { PlusIcon, SearchIcon, ArrowDown, ArrowUp, Edit, Download, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { useData, Task, TaskStatus, TaskPriority } from "@/contexts/data-context";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { TaskEditDialog } from "@/components/TaskEditDialog";

const statusOptions = [
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
];

const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const sortOptions = [
  { value: "oldest", label: "Oldest First" },
  { value: "newest", label: "Newest First" },
  { value: "priority-high", label: "Priority: High to Low" },
  { value: "priority-low", label: "Priority: Low to High" },
  { value: "due-date", label: "Due Date" },
];

const getStatusColor = (status: TaskStatus | string) => {
  switch (status) {
    case TaskStatus.TODO:
    case 'open':
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
    case TaskStatus.IN_PROGRESS:
    case 'in progress':
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
    case TaskStatus.PENDING:
    case 'pending':
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
    case TaskStatus.COMPLETED:
    case 'completed':
    case 'done':
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
  }
};

export default function Tasks() {
  const { tasks, clients, addTask, updateTask, isLoading } = useData();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<string>("oldest");
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isEditTaskOpen, setIsEditTaskOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const [newTask, setNewTask] = useState<Omit<Task, "id">>({
    title: "",
    description: "",
    client_id: "",
    status: TaskStatus.PENDING,
    priority: TaskPriority.MEDIUM,
    due_date: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setNewTask((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setNewTask((prev) => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setNewTask((prev) => ({ ...prev, due_date: date.toISOString() }));
    }
  };

  const handleAddTask = async () => {
    if (!newTask.title || !newTask.client_id) {
      toast({
        title: "Missing information",
        description: "Title and client are required.",
        variant: "destructive",
      });
      return;
    }

    try {
      await addTask(newTask);
      setNewTask({
        title: "",
        description: "",
        client_id: "",
        status: TaskStatus.PENDING,
        priority: TaskPriority.MEDIUM,
        due_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      setIsAddTaskOpen(false);
    } catch (error) {
      console.error("Error adding task:", error);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const taskStatus = status === "pending" ? TaskStatus.PENDING : 
                         status === "completed" ? TaskStatus.COMPLETED :
                         status === "todo" ? TaskStatus.TODO :
                         status === "in_progress" ? TaskStatus.IN_PROGRESS :
                         status === "blocked" ? TaskStatus.BLOCKED : TaskStatus.PENDING;
      
      await updateTask(id, { status: taskStatus });
    } catch (error) {
      console.error("Error updating task status:", error);
    }
  };

  const handleEditTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      await updateTask(taskId, updates);
      toast({
        title: "Task updated",
        description: "The task has been updated successfully.",
      });
    } catch (error) {
      console.error("Error updating task:", error);
      toast({
        title: "Error",
        description: "Failed to update task. Please try again.",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (task: Task) => {
    setSelectedTask(task);
    setIsEditTaskOpen(true);
  };

  const exportTasks = () => {
    try {
      const tasksToExport = [...filteredTasks].sort((a, b) => {
        switch (sortOrder) {
          case "newest":
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          case "oldest":
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          case "priority-high":
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) - 
                   (priorityOrder[a.priority as keyof typeof priorityOrder] || 0);
          case "priority-low":
            const priorityOrderReverse = { high: 3, medium: 2, low: 1 };
            return (priorityOrderReverse[a.priority as keyof typeof priorityOrderReverse] || 0) - 
                   (priorityOrderReverse[b.priority as keyof typeof priorityOrderReverse] || 0);
          case "due-date":
            return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
          default:
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
      });

      const formattedTasks = tasksToExport.map(task => {
        const client = clients.find(c => c.id === task.client_id);
        return {
          title: task.title,
          description: task.description,
          client: client ? client.name : "Unknown",
          status: task.status,
          priority: task.priority,
          due_date: format(new Date(task.due_date), "yyyy-MM-dd"),
          created_at: format(new Date(task.created_at), "yyyy-MM-dd"),
          completed_at: task.completed_at ? format(new Date(task.completed_at), "yyyy-MM-dd") : ""
        };
      });

      const headers = ["Title", "Description", "Client", "Status", "Priority", "Due Date", "Created At", "Completed At"];
      const csvContent = [
        headers.join(','),
        ...formattedTasks.map(row => 
          [
            `"${row.title.replace(/"/g, '""')}"`,
            `"${row.description ? row.description.replace(/"/g, '""') : ''}"`,
            `"${row.client}"`,
            `"${row.status}"`,
            `"${row.priority}"`,
            row.due_date,
            row.created_at,
            row.completed_at
          ].join(',')
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = format(new Date(), "yyyy-MM-dd");
      
      link.setAttribute('href', url);
      link.setAttribute('download', `tasks-export-${timestamp}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Export successful",
        description: `${formattedTasks.length} tasks exported to CSV.`,
      });
    } catch (error) {
      console.error("Error exporting tasks:", error);
      toast({
        title: "Export failed",
        description: "There was an error exporting tasks.",
        variant: "destructive",
      });
    }
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || statusFilter === "all" || task.status === statusFilter;
    
    const matchesPriority = !priorityFilter || priorityFilter === "all" || task.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    switch (sortOrder) {
      case "newest":
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case "oldest":
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case "priority-high":
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) - 
               (priorityOrder[a.priority as keyof typeof priorityOrder] || 0);
      case "priority-low":
        const priorityOrderReverse = { high: 3, medium: 2, low: 1 };
        return (priorityOrderReverse[a.priority as keyof typeof priorityOrderReverse] || 0) - 
               (priorityOrderReverse[b.priority as keyof typeof priorityOrderReverse] || 0);
      case "due-date":
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      default:
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-muted-foreground">
            Manage and track your client tasks
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportTasks}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusIcon className="mr-2 h-4 w-4" />
                Add Task
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader>
                <DialogTitle>Add New Task</DialogTitle>
                <DialogDescription>
                  Add a new task to your dashboard.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    name="title"
                    value={newTask.title}
                    onChange={handleInputChange}
                    placeholder="Task title"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={newTask.description}
                    onChange={handleInputChange}
                    placeholder="Task description"
                    rows={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="client_id">Client</Label>
                  <Select
                    value={newTask.client_id}
                    onValueChange={(value) =>
                      handleSelectChange("client_id", value)
                    }
                  >
                    <SelectTrigger id="client_id">
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={newTask.priority}
                      onValueChange={(value) =>
                        handleSelectChange("priority", value)
                      }
                    >
                      <SelectTrigger id="priority">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        {priorityOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={newTask.status}
                      onValueChange={(value) =>
                        handleSelectChange("status", value)
                      }
                    >
                      <SelectTrigger id="status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="due_date">Due Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !newTask.due_date && "text-muted-foreground"
                        )}
                      >
                        {newTask.due_date ? (
                          format(new Date(newTask.due_date), "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={newTask.due_date ? new Date(newTask.due_date) : undefined}
                        onSelect={handleDateChange}
                        initialFocus
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleAddTask}>Add Task</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="rounded-md border">
        <div className="flex flex-col space-y-3 p-4 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search tasks..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-col space-y-3 sm:flex-row sm:space-x-4 sm:space-y-0">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                {priorityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-[180px] justify-between">
                  <span>Sort by: {sortOptions.find(o => o.value === sortOrder)?.label}</span>
                  {sortOrder.includes("newest") ? <ArrowDown className="h-4 w-4 ml-2" /> : 
                   sortOrder.includes("oldest") ? <ArrowUp className="h-4 w-4 ml-2" /> : null}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Sort Options</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {sortOptions.map((option) => (
                  <DropdownMenuItem 
                    key={option.value}
                    className={cn(
                      "cursor-pointer",
                      sortOrder === option.value && "bg-accent text-accent-foreground"
                    )}
                    onClick={() => setSortOrder(option.value)}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30px]">#</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="hidden md:table-cell">Client</TableHead>
              <TableHead className="hidden md:table-cell">Due Date</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(5)
                .fill(0)
                .map((_, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Skeleton className="h-5 w-5" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-52" />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Skeleton className="h-5 w-32" />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-24" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto h-10 w-10" />
                    </TableCell>
                  </TableRow>
                ))
            ) : sortedTasks.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-32 text-center text-muted-foreground"
                >
                  No tasks found. Try a different search or add a new task.
                </TableCell>
              </TableRow>
            ) : (
              sortedTasks.map((task, index) => {
                const client = clients.find((c) => c.id === task.client_id);
                return (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>{task.title}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {client ? (
                        <Link
                          to={`/clients/${client.id}`}
                          className="hover:underline"
                        >
                          {client.name}
                        </Link>
                      ) : (
                        "Unknown Client"
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {format(task.due_date, "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          getStatusColor(task.status),
                          "bg-opacity-10"
                        )}
                      >
                        {task.priority.charAt(0).toUpperCase() +
                          task.priority.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={task.status}
                        onValueChange={(value) =>
                          handleStatusChange(task.id, value)
                        }
                      >
                        <SelectTrigger
                          className={cn(
                            "w-[130px]",
                            task.status === "completed"
                              ? "bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-100"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-800 dark:text-amber-100"
                          )}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 p-0"
                          onClick={() => openEditDialog(task)}
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Edit task</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          asChild
                        >
                          <Link to={`/tasks/${task.id}`}>
                            <span className="sr-only">View task</span>
                            <SearchIcon className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <TaskEditDialog
        task={selectedTask}
        clients={clients}
        isOpen={isEditTaskOpen}
        onOpenChange={setIsEditTaskOpen}
        onSave={handleEditTask}
      />
    </div>
  );
}
