import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { PlusIcon, FileText, Link as LinkIcon, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Resource } from "@/lib/models";

const AdminResources = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"file" | "link">("link");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("resources")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setResources(data as Resource[] || []);
    } catch (error) {
      console.error("Error fetching resources:", error);
      toast.error("Failed to load resources");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddResource = async () => {
    try {
      if (!title) {
        toast.error("Please enter a title");
        return;
      }

      if (type === "link" && !url) {
        toast.error("Please enter a URL");
        return;
      }

      if (type === "file" && !file) {
        toast.error("Please select a file");
        return;
      }

      setIsSubmitting(true);

      let resourceUrl = url;
      
      if (type === "file" && file) {
        const { data: buckets } = await supabase.storage.listBuckets();
        const resourceBucket = buckets?.find(b => b.name === 'resources');
        
        if (!resourceBucket) {
          const { error: bucketError } = await supabase.storage
            .createBucket('resources', { public: true });
          
          if (bucketError) throw bucketError;
        }
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        const filePath = `resources/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('resources')
          .upload(filePath, file, {
            upsert: true,
            cacheControl: '3600'
          });
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('resources')
          .getPublicUrl(filePath);
        
        resourceUrl = publicUrl;
      }
      
      const { error } = await supabase
        .from("resources")
        .insert({
          title,
          description,
          type,
          url: resourceUrl
        });
      
      if (error) throw error;
      
      toast.success("Resource added successfully");
      resetForm();
      setIsAddDialogOpen(false);
      fetchResources();
    } catch (error) {
      console.error("Error adding resource:", error);
      toast.error("Failed to add resource");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteResource = async (id: string) => {
    try {
      const { data: resource, error: fetchError } = await supabase
        .from("resources")
        .select("*")
        .eq("id", id)
        .single();
      
      if (fetchError) throw fetchError;
      
      const { error } = await supabase
        .from("resources")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      
      if (resource.type === "file") {
        const urlParts = resource.url.split("/");
        const fileName = urlParts[urlParts.length - 1];
        const filePath = `resources/${fileName}`;
        
        await supabase.storage
          .from('resources')
          .remove([filePath])
          .catch(err => console.error("Error removing file from storage:", err));
      }
      
      toast.success("Resource deleted successfully");
      
      setResources(resources.filter(r => r.id !== id));
    } catch (error) {
      console.error("Error deleting resource:", error);
      toast.error("Failed to delete resource");
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setType("link");
    setUrl("");
    setFile(null);
  };

  const filteredResources = resources.filter(resource => 
    resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (resource.description && resource.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Resources</h1>
          <p className="text-muted-foreground">
            Manage resources for clients
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="mr-2 h-4 w-4" />
              Add Resource
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Resource</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input 
                  id="title" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  placeholder="Resource title"
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder="Optional description"
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Resource Type</Label>
                <Select 
                  value={type} 
                  onValueChange={(value) => setType(value as "file" | "link")}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="link">Link</SelectItem>
                    <SelectItem value="file">File</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {type === "link" ? (
                <div className="space-y-2">
                  <Label htmlFor="url">URL</Label>
                  <Input 
                    id="url" 
                    value={url} 
                    onChange={(e) => setUrl(e.target.value)} 
                    placeholder="https://example.com"
                    disabled={isSubmitting}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="file">File</Label>
                  <Input 
                    id="file" 
                    type="file" 
                    onChange={(e) => setFile(e.target.files?.[0] || null)} 
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-muted-foreground">
                    Max file size: 10MB. Supported formats: PDF, DOC, DOCX, XLS, XLSX, PNG, JPG, ZIP.
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button onClick={handleAddResource} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Resource"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>All Resources</CardTitle>
            <div className="relative w-full md:w-64">
              <Input
                type="search"
                placeholder="Search resources..."
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
              <span className="ml-2">Loading resources...</span>
            </div>
          ) : filteredResources.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No resources found</p>
              <p className="text-sm text-muted-foreground">
                {searchTerm ? "Try a different search term" : "Add your first resource to get started"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResources.map((resource) => (
                    <TableRow key={resource.id}>
                      <TableCell className="font-medium">
                        <div>
                          {resource.title}
                          {resource.description && (
                            <p className="text-sm text-muted-foreground truncate max-w-md">
                              {resource.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {resource.type === "file" ? (
                            <FileText className="h-4 w-4 mr-2 text-blue-500" />
                          ) : (
                            <LinkIcon className="h-4 w-4 mr-2 text-green-500" />
                          )}
                          {resource.type === "file" ? "File" : "Link"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(resource.created_at), "PP")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => window.open(resource.url, "_blank")}
                          >
                            <ExternalLink className="h-4 w-4" />
                            <span className="sr-only">View</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDeleteResource(resource.id)}
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

export default AdminResources;
