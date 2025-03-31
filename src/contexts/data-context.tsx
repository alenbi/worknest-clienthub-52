import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';

export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  domain?: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
  avatar?: string;
}

export type TaskStatus = 'open' | 'in progress' | 'done' | 'pending' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  client_id: string;
  created_at: string;
  completed_at?: string;
  updated_at?: string;
  priority?: TaskPriority;
  due_date?: string;
}

export interface Resource {
  id: string;
  title: string;
  description?: string;
  url: string;
  type: 'document' | 'video' | 'link' | string;
  created_at?: string;
}

export interface Video {
  id: string;
  title: string;
  description?: string;
  url: string;
  youtube_id?: string;
  created_at?: string;
}

export interface Offer {
  id: string;
  title: string;
  description?: string;
  price?: number;
  discount?: number;
  active?: boolean;
  code?: string;
  discount_percentage?: number;
  valid_until?: string;
  created_at?: string;
}

export interface Update {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  is_published: boolean;
  created_at?: string;
}

interface Data {
  clients: Client[];
  tasks: Task[];
  resources: Resource[];
  videos: Video[];
  offers: Offer[];
  updates: Update[];
  refreshData: () => Promise<void>;
  createClient: (client: Omit<Client, 'id'>) => Promise<Client>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<Client | void>;
  deleteClient: (id: string) => Promise<void>;
  createTask: (task: Omit<Task, 'id'>) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<Task | void>;
  deleteTask: (id: string) => Promise<void>;
  createResource: (resource: Omit<Resource, 'id'>) => Promise<Resource>;
  updateResource: (id: string, updates: Partial<Resource>) => Promise<Resource | void>;
  deleteResource: (id: string) => Promise<void>;
  createVideo: (video: Omit<Video, 'id'>) => Promise<Video>;
  updateVideo: (id: string, updates: Partial<Video>) => Promise<Video | void>;
  deleteVideo: (id: string) => Promise<void>;
  createOffer: (offer: Omit<Offer, 'id'>) => Promise<Offer>;
  updateOffer: (id: string, updates: Partial<Offer>) => Promise<Offer | void>;
  deleteOffer: (id: string) => Promise<void>;
  createUpdate: (data: { title: string; content: string; image_url?: string; is_published?: boolean }) => Promise<Update>;
  updateUpdate: (id: string, data: { title?: string; content?: string; image_url?: string; is_published?: boolean; created_at?: string }) => Promise<Update | void>;
  deleteUpdate: (id: string) => Promise<void>;
  isLoading?: boolean;
  toggleUpdatePublished: (id: string, isPublished: boolean) => Promise<void>;
  addTask: (task: Omit<Task, 'id'>) => Promise<Task>;
  updateClientPassword?: (clientId: string, newPassword: string) => Promise<void>;
  addClient?: (client: Omit<Client, 'id'>) => Promise<Client>;
}

const DataContext = createContext<Data | undefined>(undefined);

interface DataProviderProps {
  children: React.ReactNode;
}

interface UpdateData {
  title: string;
  content: string;
  image_url?: string;
  is_published?: boolean;
  created_at?: string;
}

export const updateDataContext = (data: UpdateData | null = null): Data => {
  const [clients, setClients] = useState<Client[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select("*")
        .order('name', { ascending: true });

      if (clientsError) throw clientsError;
      
      console.log("Clients data loaded:", clientsData?.length || 0);
      setClients(clientsData || []);

      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select(`
          id,
          title,
          description,
          status,
          client_id,
          created_at,
          updated_at,
          completed_at,
          priority,
          due_date
        `)
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;
      
      console.log("Tasks data loaded:", tasksData?.length || 0);
      
      const typedTasks = (tasksData || []).map(task => ({
        ...task,
        status: task.status as TaskStatus,
        priority: task.priority as TaskPriority,
      }));
      setTasks(typedTasks);

      const { data: resourcesData, error: resourcesError } = await supabase
        .from("resources")
        .select("id, title, description, url, type, created_at")
        .order('created_at', { ascending: false });

      if (resourcesError) throw resourcesError;
      setResources(resourcesData || []);

      const { data: videosData, error: videosError } = await supabase
        .from("videos")
        .select("id, title, description, youtube_id, created_at")
        .order('created_at', { ascending: false });

      if (videosError) throw videosError;
      const formattedVideos = (videosData || []).map(video => ({
        ...video,
        url: video.youtube_id ? `https://youtube.com/watch?v=${video.youtube_id}` : ''
      }));
      setVideos(formattedVideos);

      const { data: offersData, error: offersError } = await supabase
        .from("offers")
        .select("id, title, description, discount_percentage, valid_until, code, created_at")
        .order('created_at', { ascending: false });

      if (offersError) throw offersError;
      setOffers(offersData || []);

      const { data: updatesData, error: updatesError } = await supabase
        .from("updates")
        .select("id, title, content, image_url, is_published, created_at")
        .order('created_at', { ascending: false });

      if (updatesError) throw updatesError;
      setUpdates(updatesData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);
    
  const createClient = async (client: Omit<Client, 'id'>): Promise<Client> => {
    try {
      const { data: newClient, error } = await supabase
        .from("clients")
        .insert([{ ...client, id: uuidv4() }])
        .select()
        .single();

      if (error) throw error;
      setClients((prevClients) => [...prevClients, newClient]);
      return newClient;
    } catch (error) {
      console.error("Error creating client:", error);
      throw error;
    }
  };

  const updateClient = async (id: string, updates: Partial<Client>): Promise<Client | void> => {
    try {
      const { data: updatedClient, error } = await supabase
        .from("clients")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      setClients((prevClients) =>
        prevClients.map((client) => (client.id === id ? updatedClient : client))
      );
      return updatedClient;
    } catch (error) {
      console.error("Error updating client:", error);
      throw error;
    }
  };

  const deleteClient = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
      setClients((prevClients) => prevClients.filter((client) => client.id !== id));
    } catch (error) {
      console.error("Error deleting client:", error);
      throw error;
    }
  };

  const createTask = async (task: Omit<Task, 'id'>): Promise<Task> => {
    try {
      const taskToInsert: any = {
        title: task.title,
        description: task.description,
        status: task.status,
        client_id: task.client_id,
        priority: task.priority || 'medium',
        created_at: new Date().toISOString()
      };

      if (task.due_date) {
        taskToInsert.due_date = typeof task.due_date === 'string' 
          ? task.due_date 
          : new Date(task.due_date).toISOString();
      }

      const { data: newTask, error } = await supabase
        .from("tasks")
        .insert(taskToInsert)
        .select()
        .single();

      if (error) throw error;
      setTasks((prevTasks) => [...prevTasks, newTask as Task]);
      return newTask as Task;
    } catch (error) {
      console.error("Error creating task:", error);
      throw error;
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>): Promise<Task | void> => {
    try {
      const updatesToSubmit: any = { ...updates };
      
      if (updates.due_date) {
        updatesToSubmit.due_date = typeof updates.due_date === 'string'
          ? updates.due_date
          : new Date(updates.due_date).toISOString();
      }

      const { data: updatedTask, error } = await supabase
        .from("tasks")
        .update(updatesToSubmit)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      setTasks((prevTasks) =>
        prevTasks.map((task) => (task.id === id ? updatedTask as Task : task))
      );
      return updatedTask as Task;
    } catch (error) {
      console.error("Error updating task:", error);
      throw error;
    }
  };

  const deleteTask = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
      setTasks((prevTasks) => prevTasks.filter((task) => task.id !== id));
    } catch (error) {
      console.error("Error deleting task:", error);
      throw error;
    }
  };

  const createResource = async (resource: Omit<Resource, 'id'>): Promise<Resource> => {
    try {
      const { data: newResource, error } = await supabase
        .from("resources")
        .insert([{ ...resource, id: uuidv4(), created_at: new Date().toISOString() }])
        .select()
        .single();

      if (error) throw error;
      setResources((prevResources) => [...prevResources, newResource as Resource]);
      return newResource as Resource;
    } catch (error) {
      console.error("Error creating resource:", error);
      throw error;
    }
  };

  const updateResource = async (id: string, updates: Partial<Resource>): Promise<Resource | void> => {
    try {
      const { data: updatedResource, error } = await supabase
        .from("resources")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      setResources((prevResources) =>
        prevResources.map((resource) => (resource.id === id ? updatedResource as Resource : resource))
      );
      return updatedResource as Resource;
    } catch (error) {
      console.error("Error updating resource:", error);
      throw error;
    }
  };

  const deleteResource = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase.from("resources").delete().eq("id", id);
      if (error) throw error;
      setResources((prevResources) => prevResources.filter((resource) => resource.id !== id));
    } catch (error) {
      console.error("Error deleting resource:", error);
      throw error;
    }
  };

  const createVideo = async (video: Omit<Video, 'id'>): Promise<Video> => {
    try {
      const videoToInsert = {
        title: video.title,
        description: video.description,
        url: video.url,
        youtube_id: video.youtube_id,
        created_at: new Date().toISOString()
      };

      const { data: newVideo, error } = await supabase
        .from("videos")
        .insert([{ ...videoToInsert, id: uuidv4() }])
        .select()
        .single();

      if (error) throw error;
      setVideos((prevVideos) => [...prevVideos, newVideo as Video]);
      return newVideo as Video;
    } catch (error) {
      console.error("Error creating video:", error);
      throw error;
    }
  };

  const updateVideo = async (id: string, updates: Partial<Video>): Promise<Video | void> => {
    try {
      const { data: updatedVideo, error } = await supabase
        .from("videos")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      setVideos((prevVideos) =>
        prevVideos.map((video) => (video.id === id ? updatedVideo as Video : video))
      );
      return updatedVideo as Video;
    } catch (error) {
      console.error("Error updating video:", error);
      throw error;
    }
  };

  const deleteVideo = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase.from("videos").delete().eq("id", id);
      if (error) throw error;
      setVideos((prevVideos) => prevVideos.filter((video) => video.id !== id));
    } catch (error) {
      console.error("Error deleting video:", error);
      throw error;
    }
  };

  const createOffer = async (offer: Omit<Offer, 'id'>): Promise<Offer> => {
    try {
      const offerToInsert = {
        title: offer.title,
        description: offer.description,
        price: offer.price,
        discount: offer.discount,
        active: offer.active !== undefined ? offer.active : true,
        code: offer.code,
        discount_percentage: offer.discount_percentage,
        valid_until: offer.valid_until,
        created_at: new Date().toISOString()
      };

      const { data: newOffer, error } = await supabase
        .from("offers")
        .insert([{ ...offerToInsert, id: uuidv4() }])
        .select()
        .single();

      if (error) throw error;
      setOffers((prevOffers) => [...prevOffers, newOffer as Offer]);
      return newOffer as Offer;
    } catch (error) {
      console.error("Error creating offer:", error);
      throw error;
    }
  };

  const updateOffer = async (id: string, updates: Partial<Offer>): Promise<Offer | void> => {
    try {
      const { data: updatedOffer, error } = await supabase
        .from("offers")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      setOffers((prevOffers) =>
        prevOffers.map((offer) => (offer.id === id ? updatedOffer as Offer : offer))
      );
      return updatedOffer as Offer;
    } catch (error) {
      console.error("Error updating offer:", error);
      throw error;
    }
  };

  const deleteOffer = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase.from("offers").delete().eq("id", id);
      if (error) throw error;
      setOffers((prevOffers) => prevOffers.filter((offer) => offer.id !== id));
    } catch (error) {
      console.error("Error deleting offer:", error);
      throw error;
    }
  };

  const createUpdate = async (data: { title: string; content: string; image_url?: string; is_published?: boolean }) => {
    try {
      const { data: update, error } = await supabase
        .from("updates")
        .insert({
          title: data.title,
          content: data.content,
          image_url: data.image_url,
          is_published: data.is_published || false,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      setUpdates((prevUpdates) => [...prevUpdates, update as Update]);
      return update as Update;
    } catch (error) {
      console.error("Error creating update:", error);
      throw error;
    }
  };

  const updateUpdate = async (id: string, data: { title?: string; content?: string; image_url?: string; is_published?: boolean; created_at?: string }) => {
    try {
      const updateData = {
        ...data,
      };

      if (data.created_at && typeof data.created_at !== 'string') {
        updateData.created_at = new Date(data.created_at).toISOString();
      }

      const { data: update, error } = await supabase
        .from("updates")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      
      setUpdates(prevUpdates => 
        prevUpdates.map(item => item.id === id ? update as Update : item)
      );
      
      return update as Update;
    } catch (error) {
      console.error("Error updating update:", error);
      throw error;
    }
  };

  const deleteUpdate = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase.from("updates").delete().eq("id", id);
      if (error) throw error;
      setUpdates((prevUpdates) => prevUpdates.filter((update) => update.id !== id));
    } catch (error) {
      console.error("Error deleting update:", error);
      throw error;
    }
  };

  const toggleUpdatePublished = async (id: string, isPublished: boolean): Promise<void> => {
    try {
      const { error } = await supabase
        .from("updates")
        .update({ is_published: isPublished })
        .eq("id", id);
      
      if (error) throw error;
      
      setUpdates(prevUpdates => 
        prevUpdates.map(update => 
          update.id === id ? { ...update, is_published: isPublished } : update
        )
      );
    } catch (error) {
      console.error("Error toggling update published status:", error);
      throw error;
    }
  };

  const addTask = createTask;

  const updateClientPassword = async (clientId: string, newPassword: string): Promise<void> => {
    try {
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .select("user_id")
        .eq("id", clientId)
        .single();
      
      if (clientError) throw clientError;
      
      if (!client.user_id) {
        throw new Error("Client does not have a user account");
      }
      
      const { error } = await supabase.auth.admin.updateUserById(client.user_id, {
        password: newPassword
      });
      
      if (error) throw error;
    } catch (error) {
      console.error("Error updating client password:", error);
      throw error;
    }
  };

  const addClient = createClient;

  return {
    clients,
    tasks,
    resources,
    videos,
    offers,
    updates,
    refreshData,
    createClient,
    updateClient,
    deleteClient,
    createTask,
    updateTask,
    deleteTask,
    createResource,
    updateResource,
    deleteResource,
    createVideo,
    updateVideo,
    deleteVideo,
    createOffer,
    updateOffer,
    deleteOffer,
    createUpdate,
    updateUpdate,
    deleteUpdate,
    isLoading,
    toggleUpdatePublished,
    addTask,
    updateClientPassword,
    addClient
  };
};

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  const data = updateDataContext();

  return <DataContext.Provider value={data}>{children}</DataContext.Provider>;
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};
