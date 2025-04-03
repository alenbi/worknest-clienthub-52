
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { useData } from "@/contexts/data-context";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function ClientUpdates() {
  const { updates, refreshData, isLoading } = useData();
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [directUpdates, setDirectUpdates] = useState<any[]>([]);
  
  // Directly fetch published updates from Supabase
  const fetchPublishedUpdates = async () => {
    console.log("Directly fetching published updates...");
    
    try {
      const { data, error } = await supabase
        .from('updates')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Error fetching published updates:", error);
        throw error;
      }
      
      console.log("Directly fetched published updates:", data);
      setDirectUpdates(data || []);
      return data || [];
    } catch (error) {
      console.error("Failed to fetch published updates:", error);
      return [];
    }
  };
  
  // Manually refresh data
  const handleRefresh = async () => {
    setIsRefreshing(true);
    toast.info("Refreshing updates...");
    
    try {
      // First try the context's refresh function
      await refreshData();
      
      // Then directly fetch from Supabase as a backup
      await fetchPublishedUpdates();
      
      toast.success("Updates refreshed successfully");
    } catch (error) {
      console.error("Error refreshing updates:", error);
      toast.error("Failed to refresh updates");
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Load updates when component mounts
  useEffect(() => {
    const loadData = async () => {
      if (!initialLoadDone) {
        setIsRefreshing(true);
        console.log("Loading updates data...");
        
        try {
          // Try context refresh
          await refreshData();
          console.log("Context updates:", updates);
          
          // Direct fetch from Supabase
          const publishedData = await fetchPublishedUpdates();
          console.log("Direct fetch published updates:", publishedData);
          
        } catch (error) {
          console.error("Error loading updates:", error);
        } finally {
          setIsRefreshing(false);
          setInitialLoadDone(true);
        }
      }
    };
    
    loadData();
  }, [refreshData, initialLoadDone]);

  // Only show published updates to clients
  const publishedUpdates = updates.filter(update => update.is_published);
  console.log("Published updates from context:", publishedUpdates);
  console.log("Direct published updates:", directUpdates);

  // Combine both sources and remove duplicates
  const combinedUpdates = [...publishedUpdates];
  directUpdates.forEach(directUpdate => {
    if (!publishedUpdates.some(update => update.id === directUpdate.id)) {
      combinedUpdates.push(directUpdate);
    }
  });

  const isLoadingData = isLoading || isRefreshing;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Updates</h1>
          <p className="text-muted-foreground">
            Stay informed with the latest news and updates
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh} 
          disabled={isLoadingData}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingData ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {isLoadingData ? (
        <div className="flex justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-2 text-sm text-muted-foreground">Loading updates...</p>
          </div>
        </div>
      ) : combinedUpdates.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Updates</CardTitle>
            <CardDescription>
              There are no updates to display at this time. Check back later.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        combinedUpdates.map((update) => (
          <Card key={update.id} className="overflow-hidden">
            {update.image_url && (
              <div className="aspect-video overflow-hidden">
                <img
                  src={update.image_url}
                  alt={update.title}
                  className="w-full object-cover"
                />
              </div>
            )}
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">{update.title}</CardTitle>
                <Badge variant="outline">
                  {format(new Date(update.created_at), "MMM d, yyyy")}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: update.content }} />
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
