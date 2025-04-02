import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { Resource, Video, Offer, Client, Task, TaskStatus, TaskPriority, Update, WeeklyProduct, ProductLink, WeeklyProductWithLinks } from '@/lib/models';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';
import { 
  fetchResourcesFromFirebase, 
  createResourceInFirebase,
  updateResourceInFirebase,
  deleteResourceFromFirebase,
  fetchVideosFromFirebase,
  createVideoInFirebase,
  updateVideoInFirebase,
  deleteVideoFromFirebase,
  fetchOffersFromFirebase,
  createOfferInFirebase,
  updateOfferInFirebase,
  deleteOfferFromFirebase
} from '@/lib/firebase-utils';
import { testFirebaseConnection } from '@/lib/firebase-chat-utils';

// Re-export the types so they can be imported from data-context
export type { Resource, Video, Offer, Client, Task, Update, WeeklyProduct, ProductLink, WeeklyProductWithLinks };
export { TaskStatus, TaskPriority };

interface DataContextType {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  isLoading: boolean;
  
  // Resources
  resources: Resource[];
  createResource: (resource: Partial<Resource>) => Promise<void>;
  updateResource: (id: string, resource: Partial<Resource>) => Promise<void>;
  deleteResource: (id: string) => Promise<void>;
  
  // Videos
  videos: Video[];
  createVideo: (video: Partial<Video>) => Promise<void>;
  updateVideo: (id: string, video: Partial<Video>) => Promise<void>;
  deleteVideo: (id: string) => Promise<void>;
  
  // Offers
  offers: Offer[];
  createOffer: (offer: Partial<Offer>) => Promise<void>;
  updateOffer: (id: string, offer: Partial<Offer>) => Promise<void>;
  deleteOffer: (id: string) => Promise<void>;
  
  // Clients
  clients: Client[];
  addClient: (client: Partial<Client>) => Promise<void>;
  updateClient: (id: string, client: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  updateClientPassword: (clientId: string, newPassword: string) => Promise<void>;
  
  // Tasks
  tasks: Task[];
  addTask: (task: Partial<Task>) => Promise<void>;
  updateTask: (id: string, task: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  
  // Updates
  updates: Update[];
  createUpdate: (update: Partial<Update>) => Promise<void>;
  updateUpdate: (id: string, update: Partial<Update>) => Promise<void>;
  deleteUpdate: (id: string) => Promise<void>;
  toggleUpdatePublished: (id: string, isPublished: boolean) => Promise<void>;
  
  // Weekly Products
  weeklyProducts: WeeklyProductWithLinks[];
  createWeeklyProduct: (product: ProductFormData) => Promise<void>;
  updateWeeklyProduct: (id: string, product: ProductFormData) => Promise<void>;
  deleteWeeklyProduct: (id: string) => Promise<void>;
  toggleProductPublished: (id: string, isPublished: boolean) => Promise<void>;
  
  // Data management
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { session, user: authUser } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFirebaseAvailable, setIsFirebaseAvailable] = useState(false);
  
  const [resources, setResources] = useState<Resource[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [weeklyProducts, setWeeklyProducts] = useState<WeeklyProductWithLinks[]>([]);
  
  const user: User | null = authUser as unknown as User | null;
  
  useEffect(() => {
    const checkFirebaseConnection = async () => {
      const isConnected = await testFirebaseConnection();
      console.log("Firebase connection status:", isConnected);
      setIsFirebaseAvailable(isConnected);
    };
    
    checkFirebaseConnection();
  }, []);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        try {
          setIsLoading(true);
          const { data, error } = await supabase.rpc('is_admin', {
            user_id: user.id
          });

          if (error) {
            console.error('Error checking admin status:', error);
            setIsAdmin(false);
          } else {
            setIsAdmin(!!data);
            console.log("Admin status:", data);
          }
        } catch (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsAdmin(false);
        setIsLoading(false);
      }
    };

    checkAdminStatus();
    if (user) {
      refreshData();
    }
  }, [user]);
  
  const refreshData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      await Promise.all([
        fetchResources(),
        fetchVideos(),
        fetchOffers(),
        fetchClients(),
        fetchTasks(),
        fetchUpdates(),
        fetchWeeklyProducts()
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchResources = async () => {
    try {
      if (isFirebaseAvailable) {
        const firebaseResources = await fetchResourcesFromFirebase();
        setResources(firebaseResources);
        return;
      }
      
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setResources(data || []);
    } catch (error) {
      console.error('Error fetching resources:', error);
    }
  };
  
  const createResource = async (resource: Partial<Resource>) => {
    try {
      console.log("Creating resource:", resource);
      
      if (!resource.title || !resource.url || !resource.type) {
        throw new Error('Title, URL, and type are required');
      }
      
      if (isFirebaseAvailable) {
        await createResourceInFirebase(resource);
        await fetchResources();
        return;
      }
      
      const newResource = {
        title: resource.title,
        description: resource.description || '',
        url: resource.url,
        type: resource.type
      };
      
      const { data, error } = await supabase.from('resources').insert(newResource).select();
      
      if (error) {
        console.error("Supabase Error:", error);
        throw error;
      }
      
      console.log("Created resource successfully:", data);
      await fetchResources();
    } catch (error) {
      console.error('Error creating resource:', error);
      toast.error("Failed to add resource");
      throw error;
    }
  };

  const updateResource = async (id: string, resource: Partial<Resource>) => {
    try {
      if (isFirebaseAvailable) {
        await updateResourceInFirebase(id, resource);
        await fetchResources();
        return;
      }
      
      const { error } = await supabase.from('resources').update(resource).eq('id', id);
      if (error) throw error;
      await fetchResources();
    } catch (error) {
      console.error('Error updating resource:', error);
      throw error;
    }
  };

  const deleteResource = async (id: string) => {
    try {
      if (isFirebaseAvailable) {
        await deleteResourceFromFirebase(id);
        setResources(prevResources => prevResources.filter(r => r.id !== id));
        return;
      }
      
      const { error } = await supabase.from('resources').delete().eq('id', id);
      if (error) throw error;
      setResources(prevResources => prevResources.filter(r => r.id !== id));
    } catch (error) {
      console.error('Error deleting resource:', error);
      throw error;
    }
  };
  
  const fetchVideos = async () => {
    try {
      if (isFirebaseAvailable) {
        const firebaseVideos = await fetchVideosFromFirebase();
        setVideos(firebaseVideos);
        return;
      }
      
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error('Error fetching videos:', error);
    }
  };
  
  const createVideo = async (video: Partial<Video>) => {
    try {
      console.log("Creating video:", video);
      
      if (!video.title || !video.youtube_id) {
        throw new Error('Title and YouTube ID are required');
      }
      
      if (isFirebaseAvailable) {
        await createVideoInFirebase(video);
        await fetchVideos();
        return;
      }
      
      const newVideo = {
        title: video.title,
        description: video.description || '',
        youtube_id: video.youtube_id
      };
      
      const { data, error } = await supabase.from('videos').insert(newVideo).select();
      
      if (error) {
        console.error("Supabase Error:", error);
        throw error;
      }
      
      console.log("Created video successfully:", data);
      await fetchVideos();
    } catch (error) {
      console.error('Error creating video:', error);
      toast.error("Failed to add video");
      throw error;
    }
  };

  const updateVideo = async (id: string, video: Partial<Video>) => {
    try {
      if (isFirebaseAvailable) {
        await updateVideoInFirebase(id, video);
        await fetchVideos();
        return;
      }
      
      const { error } = await supabase.from('videos').update(video).eq('id', id);
      if (error) throw error;
      await fetchVideos();
    } catch (error) {
      console.error('Error updating video:', error);
      throw error;
    }
  };

  const deleteVideo = async (id: string) => {
    try {
      if (isFirebaseAvailable) {
        await deleteVideoFromFirebase(id);
        setVideos(prevVideos => prevVideos.filter(v => v.id !== id));
        return;
      }
      
      const { error } = await supabase.from('videos').delete().eq('id', id);
      if (error) throw error;
      setVideos(prevVideos => prevVideos.filter(v => v.id !== id));
    } catch (error) {
      console.error('Error deleting video:', error);
      throw error;
    }
  };
  
  const fetchOffers = async () => {
    try {
      if (isFirebaseAvailable) {
        const firebaseOffers = await fetchOffersFromFirebase();
        setOffers(firebaseOffers);
        return;
      }
      
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setOffers(data || []);
    } catch (error) {
      console.error('Error fetching offers:', error);
    }
  };
  
  const createOffer = async (offer: Partial<Offer>) => {
    try {
      console.log("Creating offer:", offer);
      
      if (!offer.title || !offer.valid_until) {
        throw new Error('Title and valid until date are required');
      }
      
      if (isFirebaseAvailable) {
        await createOfferInFirebase(offer);
        await fetchOffers();
        return;
      }
      
      const newOffer = {
        title: offer.title,
        description: offer.description || '',
        discount_percentage: offer.discount_percentage,
        code: offer.code,
        valid_until: offer.valid_until
      };
      
      const { data, error } = await supabase.from('offers').insert(newOffer).select();
      
      if (error) {
        console.error("Supabase Error:", error);
        throw error;
      }
      
      console.log("Created offer successfully:", data);
      await fetchOffers();
    } catch (error) {
      console.error('Error creating offer:', error);
      toast.error("Failed to add offer");
      throw error;
    }
  };

  const updateOffer = async (id: string, offer: Partial<Offer>) => {
    try {
      if (isFirebaseAvailable) {
        await updateOfferInFirebase(id, offer);
        await fetchOffers();
        return;
      }
      
      const { error } = await supabase.from('offers').update(offer).eq('id', id);
      if (error) throw error;
      await fetchOffers();
    } catch (error) {
      console.error('Error updating offer:', error);
      throw error;
    }
  };

  const deleteOffer = async (id: string) => {
    try {
      if (isFirebaseAvailable) {
        await deleteOfferFromFirebase(id);
        setOffers(prevOffers => prevOffers.filter(o => o.id !== id));
        return;
      }
      
      const { error } = await supabase.from('offers').delete().eq('id', id);
      if (error) throw error;
      setOffers(prevOffers => prevOffers.filter(o => o.id !== id));
    } catch (error) {
      console.error('Error deleting offer:', error);
      throw error;
    }
  };
  
  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };
  
  const addClient = async (client: Partial<Client>) => {
    try {
      if (!client.name || !client.email) {
        throw new Error('Name and email are required');
      }
      
      const { error } = await supabase.from('clients').insert({
        name: client.name,
        email: client.email,
        phone: client.phone || '',
        company: client.company || '',
        domain: client.domain || '',
        avatar: client.avatar
      });
      
      if (error) throw error;
      await fetchClients();
    } catch (error) {
      console.error('Error adding client:', error);
      throw error;
    }
  };

  const updateClient = async (id: string, client: Partial<Client>) => {
    try {
      const { error } = await supabase.from('clients').update(client).eq('id', id);
      if (error) throw error;
      await fetchClients();
    } catch (error) {
      console.error('Error updating client:', error);
      throw error;
    }
  };

  const deleteClient = async (id: string) => {
    try {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
      setClients(prevClients => prevClients.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error deleting client:', error);
      throw error;
    }
  };
  
  const updateClientPassword = async (clientId: string, newPassword: string) => {
    try {
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('user_id')
        .eq('id', clientId)
        .single();
      
      if (clientError || !clientData.user_id) {
        throw new Error('Could not find user account for this client');
      }
      
      const { error: pwError } = await supabase.auth.admin.updateUserById(
        clientData.user_id,
        { password: newPassword }
      );
      
      if (pwError) throw pwError;
    } catch (error) {
      console.error('Error updating client password:', error);
      throw error;
    }
  };
  
  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const typedTasks = data?.map(task => ({
        ...task,
        status: task.status as TaskStatus,
        priority: task.priority as TaskPriority
      })) || [];
      
      setTasks(typedTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };
  
  const addTask = async (task: Partial<Task>) => {
    try {
      if (!task.title || !task.client_id || !task.due_date) {
        throw new Error('Title, client, and due date are required');
      }
      
      const { error } = await supabase.from('tasks').insert({
        title: task.title,
        description: task.description || '',
        client_id: task.client_id,
        status: task.status || TaskStatus.PENDING,
        priority: task.priority || TaskPriority.MEDIUM,
        due_date: task.due_date
      });
      
      if (error) throw error;
      await fetchTasks();
    } catch (error) {
      console.error('Error adding task:', error);
      throw error;
    }
  };

  const updateTask = async (id: string, task: Partial<Task>) => {
    try {
      if (task.status === TaskStatus.COMPLETED) {
        const existingTask = tasks.find(t => t.id === id);
        if (existingTask && existingTask.status !== TaskStatus.COMPLETED) {
          task.completed_at = new Date().toISOString();
        }
      }
      
      const { error } = await supabase.from('tasks').update(task).eq('id', id);
      if (error) throw error;
      await fetchTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
      setTasks(prevTasks => prevTasks.filter(t => t.id !== id));
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  };
  
  const fetchUpdates = async () => {
    try {
      const { data, error } = await supabase
        .from('updates')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setUpdates(data || []);
    } catch (error) {
      console.error('Error fetching updates:', error);
    }
  };
  
  const createUpdate = async (update: Partial<Update>) => {
    try {
      if (!update.title || !update.content) {
        throw new Error('Title and content are required');
      }
      
      const { error } = await supabase.from('updates').insert({
        title: update.title,
        content: update.content,
        is_published: update.is_published || false,
        image_url: update.image_url
      });
      
      if (error) throw error;
      await fetchUpdates();
    } catch (error) {
      console.error('Error creating update:', error);
      throw error;
    }
  };

  const updateUpdate = async (id: string, update: Partial<Update>) => {
    try {
      const { error } = await supabase.from('updates').update(update).eq('id', id);
      if (error) throw error;
      await fetchUpdates();
    } catch (error) {
      console.error('Error updating update:', error);
      throw error;
    }
  };

  const deleteUpdate = async (id: string) => {
    try {
      const { error } = await supabase.from('updates').delete().eq('id', id);
      if (error) throw error;
      setUpdates(prevUpdates => prevUpdates.filter(u => u.id !== id));
    } catch (error) {
      console.error('Error deleting update:', error);
      throw error;
    }
  };
  
  const toggleUpdatePublished = async (id: string, isPublished: boolean) => {
    try {
      const { error } = await supabase
        .from('updates')
        .update({ is_published: isPublished })
        .eq('id', id);
      
      if (error) throw error;
      
      setUpdates(prevUpdates => 
        prevUpdates.map(update => 
          update.id === id ? { ...update, is_published: isPublished } : update
        )
      );
    } catch (error) {
      console.error('Error toggling update published status:', error);
      throw error;
    }
  };

  const fetchWeeklyProducts = async () => {
    try {
      const { data: productsData, error: productsError } = await supabase
        .from('weekly_products')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (productsError) throw productsError;
      
      const { data: linksData, error: linksError } = await supabase
        .from('product_links')
        .select('*');
      
      if (linksError) throw linksError;
      
      const productsWithLinks = productsData.map(product => ({
        ...product,
        links: linksData.filter(link => link.product_id === product.id) || []
      }));
      
      setWeeklyProducts(productsWithLinks);
    } catch (error) {
      console.error('Error fetching weekly products:', error);
    }
  };
  
  const createWeeklyProduct = async (productData: ProductFormData) => {
    try {
      const { data: product, error: productError } = await supabase
        .from('weekly_products')
        .insert({
          title: productData.title,
          description: productData.description,
          is_published: productData.is_published
        })
        .select()
        .single();
      
      if (productError) throw productError;
      
      if (productData.links && productData.links.length > 0) {
        const linksToInsert = productData.links.map(link => ({
          product_id: product.id,
          title: link.title,
          url: link.url
        }));
        
        const { error: linksError } = await supabase
          .from('product_links')
          .insert(linksToInsert);
        
        if (linksError) throw linksError;
      }
      
      await fetchWeeklyProducts();
      toast.success("Weekly product created successfully");
    } catch (error) {
      console.error('Error creating weekly product:', error);
      toast.error("Failed to create weekly product");
      throw error;
    }
  };
  
  const updateWeeklyProduct = async (id: string, productData: ProductFormData) => {
    try {
      const { error: productError } = await supabase
        .from('weekly_products')
        .update({
          title: productData.title,
          description: productData.description,
          is_published: productData.is_published
        })
        .eq('id', id);
      
      if (productError) throw productError;
      
      const { error: deleteError } = await supabase
        .from('product_links')
        .delete()
        .eq('product_id', id);
      
      if (deleteError) throw deleteError;
      
      if (productData.links && productData.links.length > 0) {
        const linksToInsert = productData.links.map(link => ({
          product_id: id,
          title: link.title,
          url: link.url
        }));
        
        const { error: linksError } = await supabase
          .from('product_links')
          .insert(linksToInsert);
        
        if (linksError) throw linksError;
      }
      
      await fetchWeeklyProducts();
      toast.success("Weekly product updated successfully");
    } catch (error) {
      console.error('Error updating weekly product:', error);
      toast.error("Failed to update weekly product");
      throw error;
    }
  };
  
  const deleteWeeklyProduct = async (id: string) => {
    try {
      const { error } = await supabase
        .from('weekly_products')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setWeeklyProducts(prevProducts => prevProducts.filter(p => p.id !== id));
      toast.success("Weekly product deleted successfully");
    } catch (error) {
      console.error('Error deleting weekly product:', error);
      toast.error("Failed to delete weekly product");
      throw error;
    }
  };
  
  const toggleProductPublished = async (id: string, isPublished: boolean) => {
    try {
      const { error } = await supabase
        .from('weekly_products')
        .update({ is_published: isPublished })
        .eq('id', id);
      
      if (error) throw error;
      
      setWeeklyProducts(prevProducts => 
        prevProducts.map(product => 
          product.id === id ? { ...product, is_published: isPublished } : product
        )
      );
      
      toast.success(isPublished ? "Product published successfully" : "Product unpublished");
    } catch (error) {
      console.error('Error toggling product published status:', error);
      toast.error("Failed to update product status");
      throw error;
    }
  };

  return (
    <DataContext.Provider
      value={{
        session,
        user,
        isAdmin,
        isLoading,
        resources,
        createResource,
        updateResource,
        deleteResource,
        videos,
        createVideo,
        updateVideo,
        deleteVideo,
        offers,
        createOffer,
        updateOffer,
        deleteOffer,
        clients,
        addClient,
        updateClient,
        deleteClient,
        updateClientPassword,
        tasks,
        addTask,
        updateTask,
        deleteTask,
        updates,
        createUpdate,
        updateUpdate,
        deleteUpdate,
        toggleUpdatePublished,
        weeklyProducts,
        createWeeklyProduct,
        updateWeeklyProduct,
        deleteWeeklyProduct,
        toggleProductPublished,
        refreshData
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
