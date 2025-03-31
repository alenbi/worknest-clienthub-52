
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useClientAuth } from "@/contexts/client-auth-context";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SearchIcon, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ClientTasks = () => {
  const { user } = useClientAuth();
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientTasks, setClientTasks] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

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
    // Fetch tasks for this client directly from Supabase
    const fetchClientTasks = async () => {
      if (!clientId) return;
      
      setIsLoading(true);
      
      try {
        const { data, error } = await supabase
          .from("tasks")
          .select("*")
          .eq("client_id", clientId)
          .order("created_at", { ascending: false });
          
        if (error) throw error;
        
        setClientTasks(data || []);
      } catch (error) {
        console.error("Error fetching client tasks:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (clientId) {
      fetchClientTasks();
    }
  }, [clientId]);

  // Filter and search tasks
  const filteredTasks = clientTasks.filter((task) => {
    const matchesSearch = 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.description || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || statusFilter === "all" || task.status === statusFilter;
    
    const matchesPriority = !priorityFilter || priorityFilter === "all" || task.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const priorityOptions = [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading tasks...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Tasks</h1>
        <p className="text-muted-foreground">
          View and manage your tasks
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 mb-4">
            <div className="flex flex-1 items-center space-x-2">
              <div className="relative flex-1 md:max-w-sm">
                <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search tasks..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-col space-y-2 md:flex-row md:space-x-2 md:space-y-0">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="todo">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
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
            </div>
          </div>

          {filteredTasks.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">{task.title}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={
                            task.priority === "high" 
                              ? "bg-red-100 text-red-800 hover:bg-red-100"
                              : task.priority === "medium" 
                              ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                              : "bg-green-100 text-green-800 hover:bg-green-100"
                          }
                        >
                          {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(task.due_date), "PP")}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={task.status === "completed" 
                            ? "bg-green-100 text-green-800 hover:bg-green-100" 
                            : "bg-blue-100 text-blue-800 hover:bg-blue-100"
                          }
                        >
                          {task.status === "completed" ? "Completed" : "Pending"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <p className="text-muted-foreground">No tasks found.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientTasks;
