import { createContext, useContext, useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth-context";
import { Resource, Video, Offer, ClientMessage } from "@/lib/models";

// Data models
export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  domain?: string;
  avatar?: string;
  createdAt: Date;
  user_id?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  clientId: string;
  status: "pending" | "completed";
  priority: "low" | "medium" | "high";
  dueDate: Date;
  createdAt: Date;
  completedAt?: Date;
}

export interface Update {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  is_published: boolean;
  created_at: Date | string;
}

// Reexport for use throughout the app
export type { Resource, Video, Offer, ClientMessage };

interface DataContextType {
  clients: Client[];
  tasks: Task[];
  updates: Update[];
  addClient: (client: Omit<Client, "id" | "createdAt"> & { password?: string }) => Promise<{ client: Client; password: string }>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<Client>;
  updateClientPassword: (clientId: string, newPassword: string) => Promise<boolean>;
  deleteClient: (id: string) => Promise<boolean>;
  addTask: (task: Omit<Task, "id" | "createdAt" | "completedAt">) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<Task>;
  deleteTask: (id: string) => Promise<boolean>;
  createUpdate: (update: Omit<Update, "id" | "created_at">) => Promise<Update>;
  updateUpdate: (update: Partial<Update> & { id: string }) => Promise<Update>;
  toggleUpdatePublished: (id: string, isPublished: boolean) => Promise<Update>;
  deleteUpdate: (id: string) => Promise<boolean>;
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
  domain: client.domain || "",
  avatar: client.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(client.name)}&background=6366f1&color=fff`,
  createdAt: new Date(client.created_at),
  user_id: client.user_id,
});

const transformTaskFromDB = (task: any): Task => ({
  id: task.id,
  title: task.title,
  description: task.description || "",
  clientId: task.client_id,
  status: task.status === "completed" ? "completed" : "pending",
  priority: task.priority,
  dueDate: new Date(task.due_date),
  createdAt: new Date(task.created_at),
  completedAt: task.completed_at ? new Date(task.completed_at) : undefined,
});

const transformUpdateFromDB = (update: any): Update => ({
  id: update.id,
  title: update.title,
  content: update.content,
  image_url: update.image_url || undefined,
  is_published: update.is_published,
  created_at: new Date(update.created_at),
});

// Predefined tasks to create for new clients
const predefinedTasks = [
  "Domain & Hosting",
  "Hostinger Invite",
  "Site Installation",
  "Find & Replace",
  "WhatsApp Widget",
  "Header",
  "Footer",
  "Home",
  "SMTP",
  "Woo Settings",
  "Tracker",
  "Resell License",
  "Access File",
  "Forward to Kamalesh",
  "Connect Gateway",
  "Anydesk Session",
  "Update Page",
  "Affiliate Setup",
  "Ad Campaign",
  "Chatbot"
];

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  const fetchData = async () => {
    if (!isAuthenticated) {
      setClients([]);
      setTasks([]);
      setUpdates([]);
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
        .order("created_at", { ascending: true });

      if (tasksError) {
        throw tasksError;
      }

      // Fetch updates
      const { data: updatesData, error: updatesError } = await supabase
        .from("updates")
        .select("*")
        .order("created_at", { ascending: false });

      if (updatesError) {
        throw updatesError;
      }

      // Transform data
      const transformedClients = clientsData.map(transformClientFromDB);
      const transformedTasks = tasksData.map(transformTaskFromDB);
      const transformedUpdates = updatesData.map(transformUpdateFromDB);

      setClients(transformedClients);
      setTasks(transformedTasks);
      setUpdates(transformedUpdates);
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

  const addClient = async (clientData: Omit<Client, "id" | "createdAt"> & { password?: string }): Promise<{ client: Client; password: string }> => {
    try {
      const password = clientData.password || Math.random().toString(36).slice(-10);
      
      let userId = null;
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: clientData.email,
        password,
        options: {
          data: {
            full_name: clientData.name,
          },
        },
      });
      
      if (authError) throw authError;
      
      if (authData.user) {
        userId = authData.user.id;
        
        const dbClient = {
          name: clientData.name,
          email: clientData.email,
          phone: clientData.phone,
          company: clientData.company,
          domain: clientData.domain,
          avatar: clientData.avatar,
          user_id: userId
        };

        const { data, error } = await supabase
          .from("clients")
          .insert(dbClient)
          .select()
          .single();

        if (error) throw error;

        const newClient = transformClientFromDB(data);
        setClients(prev => [newClient, ...prev]);
        
        await createPredefinedTasks(newClient.id);
        
        toast.success(`Client added with email: ${clientData.email}`);
        return { client: newClient, password };
      } else {
        throw new Error("Failed to create user account");
      }
    } catch (error) {
      console.error("Error adding client:", error);
      toast.error("Failed to add client");
      throw error;
    }
  };

  const createPredefinedTasks = async (clientId: string) => {
    try {
      const now = new Date();
      const dueDate = new Date(now);
      dueDate.setDate(now.getDate() + 20);

      const tasksToCreate = predefinedTasks.map((title) => ({
        title,
        description: "",
        client_id: clientId,
        status: "todo",
        priority: "medium",
        due_date: dueDate.toISOString(),
      }));

      const { data, error } = await supabase
        .from("tasks")
        .insert(tasksToCreate)
        .select();

      if (error) {
        throw error;
      }

      if (data) {
        const newTasks = data.map(transformTaskFromDB);
        setTasks(prev => [...prev, ...newTasks]);
      }
      
      toast.success(`${predefinedTasks.length} tasks created for the new client`);
    } catch (error) {
      console.error("Error creating predefined tasks:", error);
      toast.error("Failed to create predefined tasks");
    }
  };

  const updateClient = async (id: string, updates: Partial<Client>): Promise<Client> => {
    try {
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.email !== undefined) dbUpdates.email = updates.email;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      if (updates.company !== undefined) dbUpdates.company = updates.company;
      if (updates.domain !== undefined) dbUpdates.domain = updates.domain;
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

  const updateClientPassword = async (clientId: string, newPassword: string): Promise<boolean> => {
    try {
      const client = clients.find(c => c.id === clientId);
      if (!client || !client.user_id) {
        toast.error("Client not found or has no associated user account");
        return false;
      }
      
      const { error } = await supabase.auth.admin.updateUserById(
        client.user_id,
        { password: newPassword }
      );
      
      if (error) throw error;
      
      toast.success("Client password updated successfully");
      return true;
    } catch (error) {
      console.error("Error updating client password:", error);
      toast.error("Failed to update client password");
      return false;
    }
  };

  const deleteClient = async (id: string): Promise<boolean> => {
    try {
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
      let dbStatus = "todo";
      
      if (taskData.status === "pending") {
        dbStatus = "todo";
      } else if (taskData.status === "completed") {
        dbStatus = "completed";
      }
      
      const dbTask = {
        title: taskData.title,
        description: taskData.description,
        client_id: taskData.clientId,
        status: dbStatus,
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
      setTasks(prev => [...prev, newTask]);
      
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
      const dbUpdates: any = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.clientId !== undefined) dbUpdates.client_id = updates.clientId;
      if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
      if (updates.dueDate !== undefined) dbUpdates.due_date = new Date(updates.dueDate).toISOString();
      
      if (updates.status !== undefined) {
        if (updates.status === "pending") {
          dbUpdates.status = "todo";
        } else if (updates.status === "completed") {
          dbUpdates.status = "completed";
        }
        
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

  const createUpdate = async (updateData: Omit<Update, "id" | "created_at">): Promise<Update> => {
    try {
      const { data, error } = await supabase
        .from("updates")
        .insert({
          title: updateData.title,
          content: updateData.content,
          image_url: updateData.image_url,
          is_published: updateData.is_published
        })
        .select()
        .single();

      if (error) throw error;

      const newUpdate = transformUpdateFromDB(data);
      setUpdates(prev => [newUpdate, ...prev]);
      
      toast.success("Update created successfully");
      return newUpdate;
    } catch (error) {
      console.error("Error creating update:", error);
      toast.error("Failed to create update");
      throw error;
    }
  };

  const updateUpdate = async (updateData: Partial<Update> & { id: string }): Promise<Update> => {
    try {
      const { id, ...rest } = updateData;
      
      const { data, error } = await supabase
        .from("updates")
        .update(rest)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      const updatedUpdate = transformUpdateFromDB(data);
      setUpdates(prev => prev.map(update => update.id === id ? updatedUpdate : update));
      
      toast.success("Update saved successfully");
      return updatedUpdate;
    } catch (error) {
      console.error("Error updating update:", error);
      toast.error("Failed to save update");
      throw error;
    }
  };

  const toggleUpdatePublished = async (id: string, isPublished: boolean): Promise<Update> => {
    return updateUpdate({ id, is_published: isPublished });
  };

  const deleteUpdate = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("updates")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setUpdates(prev => prev.filter(update => update.id !== id));
      
      toast.success("Update deleted successfully");
      return true;
    } catch (error) {
      console.error("Error deleting update:", error);
      toast.error("Failed to delete update");
      return false;
    }
  };

  const refreshData = async () => {
    await fetchData();
  };

  return (
    <DataContext.Provider
      value={{
        clients,
        tasks,
        updates,
        addClient,
        updateClient,
        updateClientPassword,
        deleteClient,
        addTask,
        updateTask,
        deleteTask,
        createUpdate,
        updateUpdate,
        toggleUpdatePublished,
        deleteUpdate,
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
