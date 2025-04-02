
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useData } from "@/contexts/data-context";
import { X, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

type LinkField = {
  title: string;
  url: string;
};

interface EditProductDialogProps {
  productId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditProductDialog({ productId, open, onOpenChange }: EditProductDialogProps) {
  const { weeklyProducts, updateWeeklyProduct } = useData();
  const [links, setLinks] = useState<LinkField[]>([]);
  const [isPublished, setIsPublished] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    defaultValues: {
      title: "",
      description: "",
    }
  });
  
  // Load product data when dialog opens
  useEffect(() => {
    if (open && productId) {
      const product = weeklyProducts.find(p => p.id === productId);
      if (product) {
        setValue("title", product.title);
        setValue("description", product.description || "");
        setIsPublished(product.is_published);
        
        // Initialize links
        const productLinks = product.links?.map(link => ({
          title: link.title,
          url: link.url
        })) || [];
        
        setLinks(productLinks.length > 0 ? productLinks : [{ title: "", url: "" }]);
        setIsLoading(false);
      }
    }
  }, [open, productId, weeklyProducts, setValue]);
  
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
      
      // Update product with links
      await updateWeeklyProduct(productId, {
        title: data.title,
        description: data.description,
        is_published: isPublished,
        links: validLinks
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating product:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Weekly Product</DialogTitle>
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
                    disabled={links.length === 1}
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
              <Label htmlFor="published">Published</Label>
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
              {isSubmitting ? "Updating..." : "Update Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
