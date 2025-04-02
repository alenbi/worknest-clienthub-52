
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useData } from "@/contexts/data-context";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Link as LinkIcon, ExternalLink, Loader2 } from "lucide-react";

interface ViewProductDialogProps {
  productId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewProductDialog({ productId, open, onOpenChange }: ViewProductDialogProps) {
  const { weeklyProducts } = useData();
  
  const product = weeklyProducts.find(p => p.id === productId);
  
  if (!product) {
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

  const openLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            {product.title}
          </DialogTitle>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Created: {format(new Date(product.created_at), "MMM d, yyyy")}</span>
            <Badge variant={product.is_published ? "default" : "outline"}>
              {product.is_published ? "Published" : "Draft"}
            </Badge>
          </div>
        </DialogHeader>
        
        <div className="py-4">
          {product.description && (
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-1">Description:</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {product.description}
              </p>
            </div>
          )}
          
          <Separator className="my-4" />
          
          <div>
            <h3 className="text-sm font-medium mb-3">Product Links:</h3>
            {product.links && product.links.length > 0 ? (
              <div className="space-y-3">
                {product.links.map((link) => (
                  <Card key={link.id} className="overflow-hidden">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center truncate">
                          <LinkIcon className="mr-2 h-4 w-4 text-primary flex-shrink-0" />
                          <span className="font-medium truncate">{link.title}</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => openLink(link.url)}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="mt-1 pl-6">
                        <p className="text-xs text-muted-foreground truncate">
                          {link.url}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No links available for this product.</p>
            )}
          </div>
        </div>
        
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
