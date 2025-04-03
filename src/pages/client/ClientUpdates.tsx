
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

export default function ClientUpdates() {
  const { updates, refreshData, isLoading } = useData();
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  
  // Only show published updates to clients
  const publishedUpdates = updates.filter(update => update.is_published);
  
  // Manually refresh data
  const handleRefresh = async () => {
    setIsRefreshing(true);
    toast.info("Refreshing updates...");
    
    try {
      await refreshData();
      toast.success("Updates refreshed successfully");
      console.log("Updates refreshed: Found", publishedUpdates.length, "published updates");
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
          await refreshData();
          console.log("Updates data loaded successfully");
          console.log("Total updates:", updates.length);
          console.log("Published updates:", publishedUpdates.length);
          console.log("Published update IDs:", publishedUpdates.map(u => u.id));
          
          // Check if any updates are marked as published
          const anyPublished = updates.some(u => u.is_published === true);
          console.log("Any updates marked as published:", anyPublished);
          
          // Log full update data for debugging
          console.log("Full updates data:", JSON.stringify(updates));
        } catch (error) {
          console.error("Error loading updates:", error);
        } finally {
          setIsRefreshing(false);
          setInitialLoadDone(true);
        }
      }
    };
    
    loadData();
  }, [refreshData, updates.length, initialLoadDone]);

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
      ) : publishedUpdates.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Updates</CardTitle>
            <CardDescription>
              There are no updates to display at this time. Check back later.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        publishedUpdates.map((update) => (
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
