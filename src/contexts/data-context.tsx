
import { createContext, useContext, useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth-context";

// Data models
export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  avatar?: string;
  createdAt: Date;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  clientId: string;
  status: "todo" | "in-progress" | "completed";
  priority: "low" | "medium" | "high";
  dueDate: Date;
  createdAt: Date;
  completedAt?: Date;
}

interface DataContextType {
  clients: Client[];
  tasks: Task[];
  addClient: (client: Omit<Client, "id" | "createdAt">) => Promise<Client>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<Client>;
  deleteClient: (id: string) => Promise<boolean>;
  addTask: (task: Omit<Task, "id" | "createdAt" | "completedAt">) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<Task>;
  deleteTask: (id: string) => Promise<boolean>;
  isLoading: boolean;
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Helper functions to transform data between frontend and database
const transformClientFromDB = (client: any): Client => ({
  id: client.id,
  name: client.name,
  email: client.email,
  phone: client.phone || "",
  company: client.company || "",
  avatar: client.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(client.name)}&background=6366f1&color=fff`,
  createdAt: new Date(client.created_at),
});

const transformTaskFromDB = (task: any): Task => ({
  id: task.id,
  title: task.title,
  description: task.description || "",
  clientId: task.client_id,
  status: task.status,
  priority: task.priority,
  dueDate: new Date(task.due_date),
  createdAt: new Date(task.created_at),
  completedAt: task.completed_at ? new Date(task.completed_at) : undefined,
});

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  const fetchData = async () => {
    if (!isAuthenticated) {
      setClients([]);
      setTasks([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Fetch clients
      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });

      if (clientsError) {
        throw clientsError;
      }

      // Fetch tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false });

      if (tasksError) {
        throw tasksError;
      }

      // Transform data
      const transformedClients = clientsData.map(transformClientFromDB);
      const transformedTasks = tasksData.map(transformTaskFromDB);

      setClients(transformedClients);
      setTasks(transformedTasks);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isAuthenticated]);

  const addClient = async (clientData: Omit<Client, "id" | "createdAt">): Promise<Client> => {
    try {
      // Prepare data for database
      const dbClient = {
        name: clientData.name,
        email: clientData.email,
        phone: clientData.phone,
        company: clientData.company,
        avatar: clientData.avatar,
      };

      const { data, error } = await supabase
        .from("clients")
        .insert(dbClient)
        .select()
        .single();

      if (error) throw error;

      const newClient = transformClientFromDB(data);
      setClients(prev => [newClient, ...prev]);
      
      toast.success("Client added successfully");
      return newClient;
    } catch (error) {
      console.error("Error adding client:", error);
      toast.error("Failed to add client");
      throw error;
    }
  };

  const updateClient = async (id: string, updates: Partial<Client>): Promise<Client> => {
    try {
      // Prepare data for database
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.email !== undefined) dbUpdates.email = updates.email;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      if (updates.company !== undefined) dbUpdates.company = updates.company;
      if (updates.avatar !== undefined) dbUpdates.avatar = updates.avatar;
      dbUpdates.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from("clients")
        .update(dbUpdates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      const updatedClient = transformClientFromDB(data);
      setClients(prev => prev.map(client => client.id === id ? updatedClient : client));
      
      toast.success("Client updated successfully");
      return updatedClient;
    } catch (error) {
      console.error("Error updating client:", error);
      toast.error("Failed to update client");
      throw error;
    }
  };

  const deleteClient = async (id: string): Promise<boolean> => {
    try {
      // Check if client has tasks
      const clientTasks = tasks.filter(task => task.clientId === id && task.status !== "completed");
      
      if (clientTasks.length > 0) {
        toast.error("Cannot delete client with active tasks");
        return false;
      }
      
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setClients(prev => prev.filter(client => client.id !== id));
      // Also filter out client's tasks from local state
      setTasks(prev => prev.filter(task => task.clientId !== id));
      
      toast.success("Client deleted successfully");
      return true;
    } catch (error) {
      console.error("Error deleting client:", error);
      toast.error("Failed to delete client");
      return false;
    }
  };

  const addTask = async (taskData: Omit<Task, "id" | "createdAt" | "completedAt">): Promise<Task> => {
    try {
      // Prepare data for database
      const dbTask = {
        title: taskData.title,
        description: taskData.description,
        client_id: taskData.clientId,
        status: taskData.status,
        priority: taskData.priority,
        due_date: new Date(taskData.dueDate).toISOString(),
      };

      const { data, error } = await supabase
        .from("tasks")
        .insert(dbTask)
        .select()
        .single();

      if (error) throw error;

      const newTask = transformTaskFromDB(data);
      setTasks(prev => [newTask, ...prev]);
      
      toast.success("Task added successfully");
      return newTask;
    } catch (error) {
      console.error("Error adding task:", error);
      toast.error("Failed to add task");
      throw error;
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>): Promise<Task> => {
    try {
      // Prepare data for database
      const dbUpdates: any = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.clientId !== undefined) dbUpdates.client_id = updates.clientId;
      if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
      if (updates.dueDate !== undefined) dbUpdates.due_date = new Date(updates.dueDate).toISOString();
      
      // Handle status update and completed_at
      if (updates.status !== undefined) {
        dbUpdates.status = updates.status;
        
        // If status is changing to completed, set completed_at
        const task = tasks.find(t => t.id === id);
        if (task && updates.status === "completed" && task.status !== "completed") {
          dbUpdates.completed_at = new Date().toISOString();
        } else if (updates.status !== "completed") {
          dbUpdates.completed_at = null;
        }
      }
      
      dbUpdates.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from("tasks")
        .update(dbUpdates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      const updatedTask = transformTaskFromDB(data);
      setTasks(prev => prev.map(task => task.id === id ? updatedTask : task));
      
      toast.success("Task updated successfully");
      return updatedTask;
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
      throw error;
    }
  };

  const deleteTask = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setTasks(prev => prev.filter(task => task.id !== id));
      
      toast.success("Task deleted successfully");
      return true;
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error("Failed to delete task");
      return false;
    }
  };

  // Function to manually refresh data
  const refreshData = async () => {
    await fetchData();
  };

  return (
    <DataContext.Provider
      value={{
        clients,
        tasks,
        addClient,
        updateClient,
        deleteClient,
        addTask,
        updateTask,
        deleteTask,
        isLoading,
        refreshData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};
