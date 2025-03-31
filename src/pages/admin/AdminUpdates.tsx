import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, Edit, Trash2, Plus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useData } from "@/contexts/data-context";
import { CreateUpdateDialog } from "@/components/admin/CreateUpdateDialog";
import { EditUpdateDialog } from "@/components/admin/EditUpdateDialog";
import { ViewUpdateDialog } from "@/components/admin/ViewUpdateDialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function AdminUpdates() {
  const { updates, toggleUpdatePublished, deleteUpdate, isLoading } = useData();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewUpdate, setViewUpdate] = useState<string | null>(null);
  const [editUpdate, setEditUpdate] = useState<string | null>(null);

  const handleDeleteUpdate = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this update? This action cannot be undone.")) {
      await deleteUpdate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Updates</h1>
          <p className="text-muted-foreground">
            Manage and publish updates for your clients
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Create Update
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Published Updates</CardTitle>
          <CardDescription>
            View, edit, and manage updates visible to your clients
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6">
                    Loading updates...
                  </TableCell>
                </TableRow>
              ) : updates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6">
                    No updates found. Create your first update.
                  </TableCell>
                </TableRow>
              ) : (
                updates.map((update) => (
                  <TableRow key={update.id}>
                    <TableCell className="font-medium">{update.title}</TableCell>
                    <TableCell>
                      {format(new Date(update.created_at!), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={update.is_published}
                          onCheckedChange={() =>
                            toggleUpdatePublished(update.id, !update.is_published)
                          }
                        />
                        <Badge
                          variant={update.is_published ? "default" : "outline"}
                        >
                          {update.is_published ? "Published" : "Draft"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setViewUpdate(update.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setEditUpdate(update.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDeleteUpdate(update.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CreateUpdateDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      
      {viewUpdate && (
        <ViewUpdateDialog 
          updateId={viewUpdate}
          open={!!viewUpdate}
          onOpenChange={(open) => {
            if (!open) setViewUpdate(null);
          }}
        />
      )}
      
      {editUpdate && (
        <EditUpdateDialog
          updateId={editUpdate}
          open={!!editUpdate}
          onOpenChange={(open) => {
            if (!open) setEditUpdate(null);
          }}
        />
      )}
    </div>
  );
}
