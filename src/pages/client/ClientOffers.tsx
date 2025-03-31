
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Tag, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";

interface Offer {
  id: string;
  title: string;
  description: string;
  discount_percentage?: number;
  valid_until: string;
  code?: string;
  created_at: string;
}

const ClientOffers = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
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

    fetchOffers();
  }, []);

  const filteredOffers = offers.filter(offer => 
    offer.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    offer.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isOfferExpired = (validUntil: string) => {
    return new Date(validUntil) < new Date();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Promo code copied to clipboard");
    }).catch(() => {
      toast.error("Failed to copy code");
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading offers...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Special Offers</h1>
        <p className="text-muted-foreground">
          Exclusive deals and promotions for you
        </p>
      </div>

      <div className="flex justify-between items-center">
        <div className="relative w-full md:w-96">
          <Input
            type="search"
            placeholder="Search offers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filteredOffers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Tag className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No offers found</p>
            <p className="text-sm text-muted-foreground">
              {searchTerm ? "Try a different search term" : "Check back later for new offers"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredOffers.map((offer) => {
            const expired = isOfferExpired(offer.valid_until);
            
            return (
              <Card key={offer.id} className={expired ? "opacity-70" : ""}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{offer.title}</CardTitle>
                      <CardDescription className="mt-1">{offer.description}</CardDescription>
                    </div>
                    {offer.discount_percentage && (
                      <Badge className="text-lg bg-primary hover:bg-primary">
                        {offer.discount_percentage}% OFF
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Valid until:</span>
                    <span>{format(new Date(offer.valid_until), "PP")}</span>
                  </div>
                  
                  {expired && (
                    <Badge variant="outline" className="mt-2 bg-red-100 text-red-800 hover:bg-red-100">
                      Expired
                    </Badge>
                  )}
                </CardContent>
                {offer.code && (
                  <CardFooter>
                    <div className="w-full space-y-2">
                      <div className="text-sm font-medium">Promo Code:</div>
                      <div className="flex gap-2">
                        <code className="flex-1 rounded bg-muted px-3 py-2 font-mono text-sm">
                          {offer.code}
                        </code>
                        <Button 
                          variant="secondary" 
                          className="shrink-0"
                          onClick={() => copyToClipboard(offer.code!)}
                          disabled={expired}
                        >
                          Copy
                        </Button>
                      </div>
                    </div>
                  </CardFooter>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ClientOffers;
