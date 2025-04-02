
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useData } from "@/contexts/data-context";
import { X, Plus } from "lucide-react";
import { toast } from "sonner";

type LinkField = {
  title: string;
  url: string;
};

interface CreateProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProductDialog({ open, onOpenChange }: CreateProductDialogProps) {
  const { createWeeklyProduct } = useData();
  const [links, setLinks] = useState<LinkField[]>([{ title: "", url: "" }]);
  const [isPublished, setIsPublished] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      title: "",
      description: "",
    }
  });
  
  const handleAddLink = () => {
    setLinks([...links, { title: "", url: "" }]);
  };
  
  const handleRemoveLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };
  
  const handleLinkChange = (index: number, field: keyof LinkField, value: string) => {
    const newLinks = [...links];
    newLinks[index][field] = value;
    setLinks(newLinks);
  };
  
  const onSubmit = async (data: { title: string; description: string }) => {
    try {
      setIsSubmitting(true);
      
      // Validate links
      const validLinks = links.filter(link => link.title.trim() && link.url.trim());
      
      if (validLinks.length === 0) {
        toast.error("You must add at least one valid link");
        setIsSubmitting(false);
        return;
      }
      
      // Create product with links
      await createWeeklyProduct({
        title: data.title,
        description: data.description,
        is_published: isPublished,
        links: validLinks
      });
      
      // Reset form and close dialog
      reset();
      setLinks([{ title: "", url: "" }]);
      setIsPublished(false);
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating product:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Weekly Product</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title" className="required">
                Title
              </Label>
              <Input
                id="title"
                placeholder="Product title"
                {...register("title", { required: "Title is required" })}
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              )}
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="Product description"
                className="min-h-[100px]"
                {...register("description")}
              />
            </div>
            
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="links" className="required">
                  Links
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddLink}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Link
                </Button>
              </div>
              
              {links.map((link, index) => (
                <div key={index} className="grid gap-2 rounded-md border p-3 relative">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6"
                    onClick={() => handleRemoveLink(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  
                  <div className="grid gap-2">
                    <Label className="required">Link Title</Label>
                    <Input
                      placeholder="Link title"
                      value={link.title}
                      onChange={(e) => handleLinkChange(index, "title", e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label className="required">URL</Label>
                    <Input
                      placeholder="https://example.com"
                      type="url"
                      value={link.url}
                      onChange={(e) => handleLinkChange(index, "url", e.target.value)}
                      required
                    />
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="published"
                checked={isPublished}
                onCheckedChange={setIsPublished}
              />
              <Label htmlFor="published">Publish immediately</Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
