
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { PlusIcon, FileText, Link as LinkIcon, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

interface Offer {
  id: string;
  title: string;
  description?: string;
  code?: string;
  discount_percentage: number;
  valid_until?: string;
  created_at?: string;
}

const formSchema = z.object({
  title: z.string().min(2, {
    message: "Title must be at least 2 characters.",
  }),
  description: z.string().optional(),
  code: z.string().optional(),
  discount_percentage: z.string().refine((value) => {
    const num = Number(value);
    return !isNaN(num) && num >= 0 && num <= 100;
  }, {
    message: "Discount percentage must be a number between 0 and 100.",
  }),
  valid_until: z.string().optional(),
});

const AdminOffers = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      code: "",
      discount_percentage: "",
      valid_until: undefined,
    },
  });

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("offers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOffers(data as Offer[] || []);
    } catch (error) {
      console.error("Error fetching offers:", error);
      toast.error("Failed to load offers");
    } finally {
      setIsLoading(false);
    }
  };

  const addOffer = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);
      
      const offerData = {
        title: values.title,
        description: values.description || "",
        code: values.code || null,
        discount_percentage: parseInt(values.discount_percentage),
        valid_until: values.valid_until ? new Date(values.valid_until).toISOString() : null
      };
      
      const { error } = await supabase
        .from("offers")
        .insert(offerData);
      
      if (error) throw error;
      
      toast.success("Offer added successfully");
      setIsAddDialogOpen(false);
      form.reset();
      fetchOffers();
    } catch (error) {
      console.error("Error adding offer:", error);
      toast.error("Failed to add offer");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteOffer = async (id: string) => {
    try {
      const { error } = await supabase
        .from("offers")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Offer deleted successfully");
      setOffers(offers.filter((offer) => offer.id !== id));
    } catch (error) {
      console.error("Error deleting offer:", error);
      toast.error("Failed to delete offer");
    }
  };

  const filteredOffers = offers.filter((offer) =>
    offer.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (offer.description && offer.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (offer.code && offer.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Offers</h1>
          <p className="text-muted-foreground">
            Manage offers for clients
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="mr-2 h-4 w-4" />
              Add Offer
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Offer</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(addOffer)} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Offer title"
                  {...form.register("title")}
                  disabled={isSubmitting}
                />
                {form.formState.errors.title && (
                  <p className="text-sm text-red-500">{form.formState.errors.title.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Offer description"
                  {...form.register("description")}
                  disabled={isSubmitting}
                />
                {form.formState.errors.description && (
                  <p className="text-sm text-red-500">{form.formState.errors.description.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  placeholder="Offer code"
                  {...form.register("code")}
                  disabled={isSubmitting}
                />
                {form.formState.errors.code && (
                  <p className="text-sm text-red-500">{form.formState.errors.code.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount_percentage">Discount Percentage</Label>
                <Input
                  id="discount_percentage"
                  placeholder="Discount percentage"
                  {...form.register("discount_percentage")}
                  disabled={isSubmitting}
                />
                {form.formState.errors.discount_percentage && (
                  <p className="text-sm text-red-500">{form.formState.errors.discount_percentage.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="valid_until">Valid Until</Label>
                <Input
                  id="valid_until"
                  type="date"
                  {...form.register("valid_until")}
                  disabled={isSubmitting}
                />
                {form.formState.errors.valid_until && (
                  <p className="text-sm text-red-500">{form.formState.errors.valid_until.message}</p>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Offer"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>All Offers</CardTitle>
            <div className="relative w-full md:w-64">
              <Input
                type="search"
                placeholder="Search offers..."
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
              <span className="ml-2">Loading offers...</span>
            </div>
          ) : filteredOffers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No offers found</p>
              <p className="text-sm text-muted-foreground">
                {searchTerm ? "Try a different search term" : "Add your first offer to get started"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Valid Until</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOffers.map((offer) => (
                    <TableRow key={offer.id}>
                      <TableCell className="font-medium">
                        <div>
                          {offer.title}
                          {offer.description && (
                            <p className="text-sm text-muted-foreground truncate max-w-md">
                              {offer.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{offer.code || "-"}</TableCell>
                      <TableCell>{offer.discount_percentage}%</TableCell>
                      <TableCell>
                        {offer.valid_until ? format(new Date(offer.valid_until), "PP") : "-"}
                      </TableCell>
                      <TableCell>
                        {offer.created_at && format(new Date(offer.created_at), "PP")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => deleteOffer(offer.id)}
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

export default AdminOffers;
