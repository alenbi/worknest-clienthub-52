
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { PlusIcon, Video, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Video {
  id: string;
  title: string;
  description: string;
  youtube_id: string;
  created_at: string;
}

const AdminVideos = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");

  useEffect(() => {
    fetchVideos();
  }, []);

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

  const extractYoutubeId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleAddVideo = async () => {
    try {
      if (!title) {
        toast.error("Please enter a title");
        return;
      }

      if (!youtubeUrl) {
        toast.error("Please enter a YouTube URL");
        return;
      }

      // Extract YouTube ID
      const youtubeId = extractYoutubeId(youtubeUrl);
      if (!youtubeId) {
        toast.error("Invalid YouTube URL");
        return;
      }

      setIsSubmitting(true);
      
      // Insert the video
      const { error } = await supabase
        .from("videos")
        .insert({
          title,
          description,
          youtube_id: youtubeId
        });
      
      if (error) throw error;
      
      toast.success("Video added successfully");
      resetForm();
      setIsAddDialogOpen(false);
      fetchVideos();
    } catch (error) {
      console.error("Error adding video:", error);
      toast.error("Failed to add video");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteVideo = async (id: string) => {
    try {
      const { error } = await supabase
        .from("videos")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      
      toast.success("Video deleted successfully");
      
      // Update local state
      setVideos(videos.filter(v => v.id !== id));
    } catch (error) {
      console.error("Error deleting video:", error);
      toast.error("Failed to delete video");
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setYoutubeUrl("");
  };

  const filteredVideos = videos.filter(video => 
    video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    video.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Videos</h1>
          <p className="text-muted-foreground">
            Manage video tutorials for clients
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="mr-2 h-4 w-4" />
              Add Video
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Video</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input 
                  id="title" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  placeholder="Video title"
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder="Optional description"
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="youtube">YouTube URL</Label>
                <Input 
                  id="youtube" 
                  value={youtubeUrl} 
                  onChange={(e) => setYoutubeUrl(e.target.value)} 
                  placeholder="https://www.youtube.com/watch?v=..."
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground">
                  Enter a YouTube video URL (e.g., https://www.youtube.com/watch?v=12345abcde)
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button onClick={handleAddVideo} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Video"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>All Videos</CardTitle>
            <div className="relative w-full md:w-64">
              <Input
                type="search"
                placeholder="Search videos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Loading videos...</span>
            </div>
          ) : filteredVideos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Video className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No videos found</p>
              <p className="text-sm text-muted-foreground">
                {searchTerm ? "Try a different search term" : "Add your first video to get started"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>YouTube ID</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVideos.map((video) => (
                    <TableRow key={video.id}>
                      <TableCell className="font-medium">
                        <div>
                          {video.title}
                          {video.description && (
                            <p className="text-sm text-muted-foreground truncate max-w-md">
                              {video.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="bg-muted px-1 py-0.5 rounded text-xs">
                          {video.youtube_id}
                        </code>
                      </TableCell>
                      <TableCell>
                        {format(new Date(video.created_at), "PP")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => window.open(`https://www.youtube.com/watch?v=${video.youtube_id}`, "_blank")}
                          >
                            <ExternalLink className="h-4 w-4" />
                            <span className="sr-only">View</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDeleteVideo(video.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminVideos;
