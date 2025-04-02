
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
import { Eye, Edit, Trash2, Plus, Link as LinkIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useData } from "@/contexts/data-context";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { CreateProductDialog } from "@/components/admin/CreateProductDialog";
import { EditProductDialog } from "@/components/admin/EditProductDialog";
import { ViewProductDialog } from "@/components/admin/ViewProductDialog";

export default function AdminWeeklyProducts() {
  const { weeklyProducts, toggleProductPublished, deleteWeeklyProduct, isLoading } = useData();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewProduct, setViewProduct] = useState<string | null>(null);
  const [editProduct, setEditProduct] = useState<string | null>(null);

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this product? This action cannot be undone.")) {
      await deleteWeeklyProduct(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Weekly Products</h1>
          <p className="text-muted-foreground">
            Manage and publish weekly product recommendations for your clients
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Product
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Products</CardTitle>
          <CardDescription>
            View, edit, and manage weekly product recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Links</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6">
                    Loading products...
                  </TableCell>
                </TableRow>
              ) : weeklyProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6">
                    No products found. Create your first product.
                  </TableCell>
                </TableRow>
              ) : (
                weeklyProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.title}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <LinkIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span>{product.links ? product.links.length : 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(product.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={product.is_published}
                          onCheckedChange={() =>
                            toggleProductPublished(product.id, !product.is_published)
                          }
                        />
                        <Badge
                          variant={product.is_published ? "default" : "outline"}
                        >
                          {product.is_published ? "Published" : "Draft"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setViewProduct(product.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setEditProduct(product.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDeleteProduct(product.id)}
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

      <CreateProductDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      
      {viewProduct && (
        <ViewProductDialog 
          productId={viewProduct}
          open={!!viewProduct}
          onOpenChange={(open) => {
            if (!open) setViewProduct(null);
          }}
        />
      )}
      
      {editProduct && (
        <EditProductDialog
          productId={editProduct}
          open={!!editProduct}
          onOpenChange={(open) => {
            if (!open) setEditProduct(null);
          }}
        />
      )}
    </div>
  );
}
