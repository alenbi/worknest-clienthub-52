
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useData } from "@/contexts/data-context";
import { toast } from "sonner";

interface EditUpdateDialogProps {
  updateId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditUpdateDialog({ updateId, open, onOpenChange }: EditUpdateDialogProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { updates, updateUpdate } = useData();

  // Find the update in the data context
  const updateData = updates.find(u => u.id === updateId);

  // Load update data when dialog opens or updateId changes
  useEffect(() => {
    if (updateData) {
      setTitle(updateData.title);
      setContent(updateData.content);
      setImageUrl(updateData.image_url || "");
      setIsPublished(updateData.is_published);
    }
  }, [updateData, updateId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !content) {
      toast.error("Title and content are required");
      return;
    }
    
    try {
      setIsSubmitting(true);
      await updateUpdate({
        id: updateId,
        title,
        content,
        is_published: isPublished,
        image_url: imageUrl || undefined
      });
      
      toast.success("Update saved successfully");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating update:", error);
      toast.error(error.message || "Failed to save update");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!updateData) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Update</DialogTitle>
            <DialogDescription>
              Make changes to your update.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Update Title"
                disabled={isSubmitting}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your update content here..."
                className="h-40"
                disabled={isSubmitting}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="imageUrl">Image URL (Optional)</Label>
              <Input
                id="imageUrl"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                disabled={isSubmitting}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isPublished"
                checked={isPublished}
                onCheckedChange={setIsPublished}
                disabled={isSubmitting}
              />
              <Label htmlFor="isPublished" className="cursor-pointer">
                Published
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
