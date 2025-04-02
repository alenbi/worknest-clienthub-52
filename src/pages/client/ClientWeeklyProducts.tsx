
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useData } from "@/contexts/data-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Link as LinkIcon, ExternalLink, Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function ClientWeeklyProducts() {
  const { weeklyProducts, refreshData, isLoading } = useData();
  const [isRefreshing, setIsRefreshing] = useState(true);
  
  // Only show published products to clients
  const publishedProducts = weeklyProducts.filter(product => product.is_published);
  
  // Load weekly products when component mounts
  useEffect(() => {
    const loadData = async () => {
      setIsRefreshing(true);
      try {
        await refreshData();
      } catch (error) {
        console.error("Error loading weekly products:", error);
      } finally {
        setIsRefreshing(false);
      }
    };
    
    loadData();
  }, [refreshData]);

  const isLoadingData = isLoading || isRefreshing;

  const openLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Weekly Products</h1>
        <p className="text-muted-foreground">
          Discover new products and resources for your project
        </p>
      </div>

      {isLoadingData ? (
        <div className="flex justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-2 text-sm text-muted-foreground">Loading products...</p>
          </div>
        </div>
      ) : publishedProducts.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Products Available</CardTitle>
            <CardDescription>
              There are no weekly products to display at this time. Check back later.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        publishedProducts.map((product) => (
          <Card key={product.id} className="overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl flex items-center">
                  <FileText className="mr-2 h-5 w-5 text-primary" />
                  {product.title}
                </CardTitle>
                <Badge variant="outline">
                  {format(new Date(product.created_at), "MMM d, yyyy")}
                </Badge>
              </div>
              {product.description && (
                <CardDescription className="mt-2 text-base">
                  {product.description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {product.links && product.links.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Product Links:
                  </h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    {product.links.map((link) => (
                      <Card key={link.id} className="overflow-hidden">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <LinkIcon className="mr-2 h-4 w-4 text-primary" />
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
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No links available for this product.</p>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
