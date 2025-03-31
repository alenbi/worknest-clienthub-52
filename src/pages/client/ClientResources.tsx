
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ExternalLink, Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Resource {
  id: string;
  title: string;
  description: string;
  type: "file" | "link";
  url: string;
  created_at: string;
}

const ClientResources = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchResources = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from("resources")
          .select("*")
          .order("created_at", { ascending: false });
        
        if (error) throw error;
        setResources(data || []);
      } catch (error) {
        console.error("Error fetching resources:", error);
        toast.error("Failed to load resources");
      } finally {
        setIsLoading(false);
      }
    };

    fetchResources();
  }, []);

  const filteredResources = resources.filter(resource => 
    resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resource.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenResource = (resource: Resource) => {
    if (resource.type === "link") {
      window.open(resource.url, "_blank", "noopener,noreferrer");
    } else {
      // For files, open in new tab or download
      window.open(resource.url, "_blank");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading resources...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Resources</h1>
        <p className="text-muted-foreground">
          Access helpful documents and links
        </p>
      </div>

      <div className="flex justify-between items-center">
        <div className="relative w-full md:w-96">
          <Input
            type="search"
            placeholder="Search resources..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filteredResources.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No resources found</p>
            <p className="text-sm text-muted-foreground">
              {searchTerm ? "Try a different search term" : "Check back later for new resources"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredResources.map((resource) => (
            <Card key={resource.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{resource.title}</CardTitle>
                  {resource.type === "link" ? (
                    <ExternalLink className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  )}
                </div>
                <CardDescription>{resource.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleOpenResource(resource)}
                >
                  {resource.type === "link" ? (
                    <>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Open Link
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientResources;
