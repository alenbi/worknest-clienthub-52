
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useData } from "@/contexts/data-context";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface ViewUpdateDialogProps {
  updateId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewUpdateDialog({ updateId, open, onOpenChange }: ViewUpdateDialogProps) {
  const { updates } = useData();
  
  // Find the update in the data context
  const updateData = updates.find(u => u.id === updateId);
  
  if (!updateData) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="text-xl">{updateData.title}</DialogTitle>
          <DialogDescription className="flex items-center justify-between">
            <span>
              {format(new Date(updateData.created_at), "MMMM d, yyyy")}
            </span>
            <Badge variant={updateData.is_published ? "default" : "outline"}>
              {updateData.is_published ? "Published" : "Draft"}
            </Badge>
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {updateData.image_url && (
            <div className="mb-4">
              <img 
                src={updateData.image_url} 
                alt={updateData.title} 
                className="rounded-lg w-full object-cover max-h-[300px]"
              />
            </div>
          )}
          <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: updateData.content }} />
        </div>
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
