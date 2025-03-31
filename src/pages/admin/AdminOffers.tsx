
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusIcon, Trash2, Loader2, Tag } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useData } from "@/contexts/data-context";
import { Offer } from "@/lib/models";

const formSchema = z.object({
  title: z.string().min(2, {
    message: "Title must be at least 2 characters.",
  }),
  description: z.string(),
  discount_percentage: z.coerce.number().min(1).max(100, {
    message: "Discount must be between 1% and 100%.",
  }),
  code: z.string().min(3, {
    message: "Promo code must be at least 3 characters.",
  }),
  valid_until: z.date({
    required_error: "Please select a valid date.",
  }).refine(date => date > new Date(), {
    message: "Date must be in the future."
  }),
});

const AdminOffers = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { offers, createOffer, deleteOffer, isLoading } = useData();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      discount_percentage: 10,
      code: "",
      valid_until: new Date(new Date().setMonth(new Date().getMonth() + 1)),
    },
  });

  const addOffer = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);
      
      // Ensure discount_percentage is a number
      const discount = Number(values.discount_percentage);
      if (isNaN(discount) || discount < 1 || discount > 100) {
        toast.error("Discount must be between 1% and 100%");
        setIsSubmitting(false);
        return;
      }
      
      // Use data context method to create offer
      await createOffer({
        title: values.title,
        description: values.description,
        discount_percentage: discount,
        code: values.code.toUpperCase(),
        valid_until: values.valid_until.toISOString(),
      });
      
      toast.success("Offer added successfully");
      setIsAddDialogOpen(false);
      form.reset();
    } catch (error) {
      console.error("Error adding offer:", error);
      toast.error("Failed to add offer");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOffer = async (id: string) => {
    try {
      // Use data context method to delete offer
      await deleteOffer(id);
      toast.success("Offer deleted successfully");
    } catch (error) {
      console.error("Error deleting offer:", error);
      toast.error("Failed to delete offer");
    }
  };

  const isOfferExpired = (validUntil: string) => {
    return new Date(validUntil) < new Date();
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
            Manage special offers and discounts for clients
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
                  <p className="text-sm text-red-500">{form.formState.errors.title?.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Offer description"
                  {...form.register("description")}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount_percentage">Discount Percentage</Label>
                <div className="flex items-center">
                  <Input
                    id="discount_percentage"
                    type="number"
                    min="1"
                    max="100"
                    placeholder="10"
                    {...form.register("discount_percentage", { valueAsNumber: true })}
                    disabled={isSubmitting}
                  />
                  <span className="ml-2">%</span>
                </div>
                {form.formState.errors.discount_percentage && (
                  <p className="text-sm text-red-500">{form.formState.errors.discount_percentage?.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Promo Code</Label>
                <Input
                  id="code"
                  placeholder="SUMMER2025"
                  {...form.register("code")}
                  disabled={isSubmitting}
                  onChange={(e) => form.setValue("code", e.target.value.toUpperCase())}
                />
                {form.formState.errors.code && (
                  <p className="text-sm text-red-500">{form.formState.errors.code?.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="valid_until">Valid Until</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !form.watch("valid_until") && "text-muted-foreground"
                      )}
                      disabled={isSubmitting}
                    >
                      {form.watch("valid_until") ? (
                        format(form.watch("valid_until"), "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.watch("valid_until")}
                      onSelect={(date) => form.setValue("valid_until", date || new Date())}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {form.formState.errors.valid_until && (
                  <p className="text-sm text-red-500">{form.formState.errors.valid_until?.message}</p>
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
              <Tag className="h-12 w-12 text-muted-foreground mb-4" />
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
                    <TableHead className="hidden md:table-cell">Valid Until</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOffers.map((offer) => {
                    const isExpired = isOfferExpired(offer.valid_until);
                    
                    return (
                      <TableRow key={offer.id} className={isExpired ? "opacity-60" : ""}>
                        <TableCell className="font-medium">
                          <div>
                            {offer.title}
                            <p className="text-sm text-muted-foreground truncate max-w-md">
                              {offer.description}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="rounded bg-muted px-1 py-0.5 font-mono text-sm">
                            {offer.code}
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-green-100 text-green-800">
                            {offer.discount_percentage}% OFF
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {format(new Date(offer.valid_until), "PP")}
                        </TableCell>
                        <TableCell>
                          {isExpired ? (
                            <Badge variant="outline" className="bg-red-100 text-red-800">
                              Expired
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-blue-100 text-blue-800">
                              Active
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleDeleteOffer(offer.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
