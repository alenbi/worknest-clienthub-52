
import { useEffect } from "react";
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

export default function ClientUpdates() {
  const { updates, refreshData } = useData();
  
  // Only show published updates to clients
  const publishedUpdates = updates.filter(update => update.is_published);
  
  useEffect(() => {
    refreshData();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Updates</h1>
        <p className="text-muted-foreground">
          Stay informed with the latest news and updates
        </p>
      </div>

      {publishedUpdates.length === 0 ? (
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
