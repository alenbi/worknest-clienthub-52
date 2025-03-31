
import { useData } from "@/contexts/data-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { EyeIcon } from "lucide-react";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function ClientUpdates() {
  const { updates, isLoading } = useData();
  const [selectedUpdate, setSelectedUpdate] = useState<string | null>(null);

  // Filter only published updates and sort by created_at (newest first)
  const publishedUpdates = updates
    .filter((update) => update.is_published)
    .sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  const selectedUpdateData = selectedUpdate 
    ? publishedUpdates.find(u => u.id === selectedUpdate) 
    : publishedUpdates[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Updates</h1>
        <p className="text-muted-foreground">
          Stay informed about the latest news and updates
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : publishedUpdates.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p>No updates available at this time. Check back later.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Recent Updates</CardTitle>
                <CardDescription>
                  Select an update to read
                </CardDescription>
              </CardHeader>
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-2 px-4 pb-4">
                  {publishedUpdates.map((update) => (
                    <Card 
                      key={update.id}
                      className={`cursor-pointer hover:bg-muted transition-colors ${
                        selectedUpdateData?.id === update.id ? "border-primary bg-muted/50" : ""
                      }`}
                      onClick={() => setSelectedUpdate(update.id)}
                    >
                      <CardHeader className="p-4">
                        <CardTitle className="text-base">{update.title}</CardTitle>
                        <CardDescription>
                          {format(new Date(update.created_at), "MMM d, yyyy")}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          </div>

          <div className="md:col-span-2">
            {selectedUpdateData && (
              <Card className="h-full flex flex-col">
                <CardHeader>
                  <CardTitle>{selectedUpdateData.title}</CardTitle>
                  <CardDescription>
                    {format(new Date(selectedUpdateData.created_at), "MMMM d, yyyy")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  {selectedUpdateData.image_url && (
                    <div className="mb-4">
                      <img 
                        src={selectedUpdateData.image_url} 
                        alt={selectedUpdateData.title} 
                        className="rounded-lg w-full object-cover max-h-[300px]"
                      />
                    </div>
                  )}
                  <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: selectedUpdateData.content }} />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
