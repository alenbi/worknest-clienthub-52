
import { createContext, useContext, useState, useEffect } from "react";
import { toast } from "sonner";

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
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Mock data for demo purposes
const MOCK_CLIENTS: Client[] = [
  {
    id: "1",
    name: "Acme Corporation",
    email: "contact@acme.com",
    phone: "555-123-4567",
    company: "Acme Inc.",
    avatar: "https://ui-avatars.com/api/?name=Acme+Corporation&background=6366f1&color=fff",
    createdAt: new Date(2023, 1, 15),
  },
  {
    id: "2",
    name: "Globex Industries",
    email: "info@globex.com",
    phone: "555-987-6543",
    company: "Globex LLC",
    avatar: "https://ui-avatars.com/api/?name=Globex+Industries&background=f97316&color=fff",
    createdAt: new Date(2023, 2, 10),
  },
  {
    id: "3",
    name: "Stark Enterprises",
    email: "tony@stark.com",
    phone: "555-789-1234",
    company: "Stark Tech",
    avatar: "https://ui-avatars.com/api/?name=Stark+Enterprises&background=10b981&color=fff",
    createdAt: new Date(2023, 3, 5),
  },
];

const MOCK_TASKS: Task[] = [
  {
    id: "1",
    title: "Website Redesign",
    description: "Complete the website homepage redesign",
    clientId: "1",
    status: "in-progress",
    priority: "high",
    dueDate: new Date(2023, 6, 30),
    createdAt: new Date(2023, 5, 15),
  },
  {
    id: "2",
    title: "SEO Optimization",
    description: "Implement SEO recommendations",
    clientId: "1",
    status: "todo",
    priority: "medium",
    dueDate: new Date(2023, 7, 15),
    createdAt: new Date(2023, 5, 20),
  },
  {
    id: "3",
    title: "Logo Design",
    description: "Create new company logo",
    clientId: "2",
    status: "completed",
    priority: "medium",
    dueDate: new Date(2023, 5, 30),
    createdAt: new Date(2023, 4, 10),
    completedAt: new Date(2023, 5, 28),
  },
  {
    id: "4",
    title: "Content Creation",
    description: "Develop blog content for Q3",
    clientId: "2",
    status: "todo",
    priority: "low",
    dueDate: new Date(2023, 8, 1),
    createdAt: new Date(2023, 6, 1),
  },
  {
    id: "5",
    title: "Marketing Campaign",
    description: "Plan Q4 marketing campaign",
    clientId: "3",
    status: "todo",
    priority: "high",
    dueDate: new Date(2023, 8, 15),
    createdAt: new Date(2023, 6, 15),
  },
  {
    id: "6",
    title: "Product Launch",
    description: "Coordinate product launch event",
    clientId: "3",
    status: "in-progress",
    priority: "high",
    dueDate: new Date(2023, 7, 30),
    createdAt: new Date(2023, 5, 1),
  },
];

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading data from API
    const loadData = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setClients(MOCK_CLIENTS);
        setTasks(MOCK_TASKS);
      } catch (error) {
        toast.error("Failed to load data");
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const addClient = async (clientData: Omit<Client, "id" | "createdAt">): Promise<Client> => {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const newClient: Client = {
        ...clientData,
        id: Date.now().toString(),
        createdAt: new Date(),
        avatar: clientData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(clientData.name)}&background=3b82f6&color=fff`,
      };
      
      setClients(prev => [...prev, newClient]);
      toast.success("Client added successfully");
      return newClient;
    } catch (error) {
      toast.error("Failed to add client");
      throw error;
    }
  };

  const updateClient = async (id: string, updates: Partial<Client>): Promise<Client> => {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const updatedClient = clients.find(client => client.id === id);
      
      if (!updatedClient) {
        throw new Error("Client not found");
      }
      
      const updated = { ...updatedClient, ...updates };
      
      setClients(prev => prev.map(client => client.id === id ? updated : client));
      toast.success("Client updated successfully");
      return updated;
    } catch (error) {
      toast.error("Failed to update client");
      throw error;
    }
  };

  const deleteClient = async (id: string): Promise<boolean> => {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check if client has tasks
      const hasActiveTasks = tasks.some(task => task.clientId === id && task.status !== "completed");
      
      if (hasActiveTasks) {
        toast.error("Cannot delete client with active tasks");
        return false;
      }
      
      setClients(prev => prev.filter(client => client.id !== id));
      // Also delete client's tasks
      setTasks(prev => prev.filter(task => task.clientId !== id));
      toast.success("Client deleted successfully");
      return true;
    } catch (error) {
      toast.error("Failed to delete client");
      return false;
    }
  };

  const addTask = async (taskData: Omit<Task, "id" | "createdAt" | "completedAt">): Promise<Task> => {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const newTask: Task = {
        ...taskData,
        id: Date.now().toString(),
        createdAt: new Date(),
      };
      
      setTasks(prev => [...prev, newTask]);
      toast.success("Task added successfully");
      return newTask;
    } catch (error) {
      toast.error("Failed to add task");
      throw error;
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>): Promise<Task> => {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const task = tasks.find(task => task.id === id);
      
      if (!task) {
        throw new Error("Task not found");
      }
      
      // If status is changing to completed, set completedAt
      let completedAt = task.completedAt;
      if (updates.status === "completed" && task.status !== "completed") {
        completedAt = new Date();
      } else if (updates.status && updates.status !== "completed") {
        completedAt = undefined;
      }
      
      const updated = { ...task, ...updates, completedAt };
      
      setTasks(prev => prev.map(task => task.id === id ? updated : task));
      toast.success("Task updated successfully");
      return updated;
    } catch (error) {
      toast.error("Failed to update task");
      throw error;
    }
  };

  const deleteTask = async (id: string): Promise<boolean> => {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setTasks(prev => prev.filter(task => task.id !== id));
      toast.success("Task deleted successfully");
      return true;
    } catch (error) {
      toast.error("Failed to delete task");
      return false;
    }
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
