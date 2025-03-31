
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Loader2, Video } from "lucide-react";
import { toast } from "sonner";

interface Video {
  id: string;
  title: string;
  description: string;
  youtube_id: string;
  created_at: string;
}

const ClientVideos = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from("videos")
          .select("*")
          .order("created_at", { ascending: false });
        
        if (error) throw error;
        setVideos(data || []);
      } catch (error) {
        console.error("Error fetching videos:", error);
        toast.error("Failed to load videos");
      } finally {
        setIsLoading(false);
      }
    };

    fetchVideos();
  }, []);

  const filteredVideos = videos.filter(video => 
    video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    video.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading videos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Video Tutorials</h1>
        <p className="text-muted-foreground">
          Watch helpful tutorials and guides
        </p>
      </div>

      <div className="flex justify-between items-center">
        <div className="relative w-full md:w-96">
          <Input
            type="search"
            placeholder="Search videos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filteredVideos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Video className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No videos found</p>
            <p className="text-sm text-muted-foreground">
              {searchTerm ? "Try a different search term" : "Check back later for new videos"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {filteredVideos.map((video) => (
            <Card key={video.id}>
              <div className="aspect-video w-full overflow-hidden rounded-t-lg">
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${video.youtube_id}`}
                  title={video.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
              <CardHeader className="pb-2">
                <CardTitle>{video.title}</CardTitle>
                <CardDescription>{video.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientVideos;
