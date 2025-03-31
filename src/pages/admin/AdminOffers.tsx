
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { PlusIcon, Tag, Trash2, CalendarIcon, Loader2, Percent } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

interface Offer {
  id: string;
  title: string;
  description: string;
  discount_percentage?: number;
  valid_until: string;
  code?: string;
  created_at: string;
}

const AdminOffers = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [discountPercentage, setDiscountPercentage] = useState("");
  const [validUntil, setValidUntil] = useState<Date | undefined>(
    new Date(new Date().setMonth(new Date().getMonth() + 1))
  );
  const [promoCode, setPromoCode] = useState("");

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
      setOffers(data || []);
    } catch (error) {
      console.error("Error fetching offers:", error);
      toast.error("Failed to load offers");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddOffer = async () => {
    try {
      if (!title) {
        toast.error("Please enter a title");
        return;
      }

      if (!validUntil) {
        toast.error("Please select a valid until date");
        return;
      }

      setIsSubmitting(true);
      
      // Insert the offer
      const { error } = await supabase
        .from("offers")
        .insert({
          title,
          description,
          discount_percentage: discountPercentage ? parseInt(discountPercentage) : null,
          valid_until: validUntil.toISOString(),
          code: promoCode || null
        });
      
      if (error) throw error;
      
      toast.success("Offer added successfully");
      resetForm();
      setIsAddDialogOpen(false);
      fetchOffers();
    } catch (error) {
      console.error("Error adding offer:", error);
      toast.error("Failed to add offer");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOffer = async (id: string) => {
    try {
      const { error } = await supabase
        .from("offers")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      
      toast.success("Offer deleted successfully");
      
      // Update local state
      setOffers(offers.filter(o => o.id !== id));
    } catch (error) {
      console.error("Error deleting offer:", error);
      toast.error("Failed to delete offer");
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDiscountPercentage("");
    setValidUntil(new Date(new Date().setMonth(new Date().getMonth() + 1)));
    setPromoCode("");
  };

  const filteredOffers = offers.filter(offer => 
    offer.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    offer.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (offer.code && offer.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const isOfferExpired = (validUntil: string) => {
    return new Date(validUntil) < new Date();
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPromoCode(result);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Offers</h1>
          <p className="text-muted-foreground">
            Manage special offers and promotions for clients
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
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input 
                  id="title" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  placeholder="Offer title"
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder="Detailed offer description"
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount">Discount Percentage</Label>
                <div className="relative">
                  <Input 
                    id="discount" 
                    type="number"
                    value={discountPercentage} 
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (isNaN(value) || value <= 0) {
                        setDiscountPercentage("");
                      } else if (value > 100) {
                        setDiscountPercentage("100");
                      } else {
                        setDiscountPercentage(value.toString());
                      }
                    }} 
                    placeholder="e.g., 10"
                    className="pr-8"
                    disabled={isSubmitting}
                  />
                  <Percent className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Leave empty if not applicable
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="validUntil">Valid Until</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                      disabled={isSubmitting}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {validUntil ? format(validUntil, "PPP") : "Select a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={validUntil}
                      onSelect={setValidUntil}
                      initialFocus
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="promoCode">Promo Code</Label>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={generateRandomCode}
                    type="button"
                    disabled={isSubmitting}
                  >
                    Generate
                  </Button>
                </div>
                <Input 
                  id="promoCode" 
                  value={promoCode} 
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())} 
                  placeholder="e.g., SUMMER2025"
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty if not applicable
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button onClick={handleAddOffer} disabled={isSubmitting}>
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
                    <TableHead>Offer</TableHead>
                    <TableHead>Promo Code</TableHead>
                    <TableHead>Valid Until</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOffers.map((offer) => {
                    const expired = isOfferExpired(offer.valid_until);
                    
                    return (
                      <TableRow key={offer.id} className={expired ? "opacity-70" : ""}>
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-2">
                            <div>
                              {offer.title}
                              {offer.description && (
                                <p className="text-sm text-muted-foreground truncate max-w-xs">
                                  {offer.description}
                                </p>
                              )}
                            </div>
                            {offer.discount_percentage && (
                              <Badge className="bg-primary hover:bg-primary">
                                {offer.discount_percentage}% OFF
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {offer.code ? (
                            <code className="bg-muted px-2 py-1 rounded text-xs">
                              {offer.code}
                            </code>
                          ) : (
                            <span className="text-muted-foreground">None</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {format(new Date(offer.valid_until), "PPP")}
                        </TableCell>
                        <TableCell>
                          {expired ? (
                            <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100">
                              Expired
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">
                              Active
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDeleteOffer(offer.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                            <span className="sr-only">Delete</span>
                          </Button>
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
