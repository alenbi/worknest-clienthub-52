
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
import { FileText, Link as LinkIcon, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function ClientWeeklyProducts() {
  const { weeklyProducts, refreshData, isLoading } = useData();
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [directProducts, setDirectProducts] = useState<any[]>([]);
  
  // Directly fetch published products from Supabase
  const fetchPublishedProducts = async () => {
    console.log("Directly fetching published products...");
    
    try {
      // Fetch published products
      const { data: productsData, error: productsError } = await supabase
        .from('weekly_products')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });
      
      if (productsError) {
        console.error("Error fetching published products:", productsError);
        throw productsError;
      }
      
      console.log("Directly fetched published products:", productsData);
      
      // Fetch all links at once
      const { data: linksData, error: linksError } = await supabase
        .from('product_links')
        .select('*');
      
      if (linksError) {
        console.error("Error fetching product links:", linksError);
        throw linksError;
      }
      
      // Combine products with their links
      const productsWithLinks = productsData.map(product => ({
        ...product,
        links: linksData.filter(link => link.product_id === product.id) || []
      }));
      
      console.log("Products with links:", productsWithLinks);
      setDirectProducts(productsWithLinks || []);
      return productsWithLinks || [];
    } catch (error) {
      console.error("Failed to fetch published products:", error);
      return [];
    }
  };
  
  // Manually refresh data
  const handleRefresh = async () => {
    setIsRefreshing(true);
    toast.info("Refreshing products...");
    
    try {
      // First try the context's refresh function
      await refreshData();
      
      // Then directly fetch from Supabase as a backup
      await fetchPublishedProducts();
      
      toast.success("Products refreshed successfully");
    } catch (error) {
      console.error("Error refreshing products:", error);
      toast.error("Failed to refresh products");
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Load weekly products when component mounts
  useEffect(() => {
    const loadData = async () => {
      if (!initialLoadDone) {
        setIsRefreshing(true);
        console.log("Loading weekly products data...");
        
        try {
          // Try context refresh
          await refreshData();
          console.log("Context weekly products:", weeklyProducts);
          
          // Direct fetch from Supabase
          const publishedData = await fetchPublishedProducts();
          console.log("Direct fetch published products:", publishedData);
          
        } catch (error) {
          console.error("Error loading weekly products:", error);
        } finally {
          setIsRefreshing(false);
          setInitialLoadDone(true);
        }
      }
    };
    
    loadData();
  }, [refreshData, initialLoadDone]);

  // Only show published products to clients
  const publishedProducts = weeklyProducts.filter(product => product.is_published);
  console.log("Published products from context:", publishedProducts);
  console.log("Direct published products:", directProducts);

  // Combine both sources and remove duplicates
  const combinedProducts = [...publishedProducts];
  directProducts.forEach(directProduct => {
    if (!publishedProducts.some(product => product.id === directProduct.id)) {
      combinedProducts.push(directProduct);
    }
  });
  
  const isLoadingData = isLoading || isRefreshing;

  const openLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Weekly Products</h1>
          <p className="text-muted-foreground">
            Discover new products and resources for your project
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh} 
          disabled={isLoadingData}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingData ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {isLoadingData ? (
        <div className="flex justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-2 text-sm text-muted-foreground">Loading products...</p>
          </div>
        </div>
      ) : combinedProducts.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Products Available</CardTitle>
            <CardDescription>
              There are no weekly products to display at this time. Check back later.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        combinedProducts.map((product) => (
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
