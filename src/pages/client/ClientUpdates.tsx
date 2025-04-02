
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
import { Loader2 } from "lucide-react";

export default function ClientUpdates() {
  const { updates, refreshData, isLoading } = useData();
  const [isRefreshing, setIsRefreshing] = useState(true);
  
  // Only show published updates to clients
  const publishedUpdates = updates.filter(update => update.is_published);
  
  // Load updates when component mounts
  useEffect(() => {
    const loadData = async () => {
      setIsRefreshing(true);
      try {
        await refreshData();
      } catch (error) {
        console.error("Error loading updates:", error);
      } finally {
        setIsRefreshing(false);
      }
    };
    
    loadData();
  }, []);  // Remove refreshData from dependencies to prevent infinite loop

  const isLoadingData = isLoading || isRefreshing;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Updates</h1>
        <p className="text-muted-foreground">
          Stay informed with the latest news and updates
        </p>
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
