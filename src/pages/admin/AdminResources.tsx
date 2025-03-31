import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusIcon, FileText, Link as LinkIcon, Trash2, ExternalLink, Loader2, FileUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { v4 as uuidv4 } from "uuid";
import { useData } from "@/contexts/data-context";
import { Resource } from "@/lib/models";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/integrations/firebase/config";

interface ResourceType {
  id: string;
  title: string;
  description: string;
  url: string;
  type: string;
  created_at: string;
}

const formSchema = z.object({
  title: z.string().min(2, {
    message: "Title must be at least 2 characters.",
  }),
  description: z.string(),
  type: z.enum(["file", "link"], {
    required_error: "You need to select a resource type.",
  }),
  url: z.string().url("Please enter a valid URL").optional(),
  file: z.instanceof(File).optional(),
}).refine(data => {
  if (data.type === "link") {
    return !!data.url;
  }
  return true;
}, {
  message: "URL is required for link resources",
  path: ["url"],
}).refine(data => {
  if (data.type === "file") {
    return !!data.file;
  }
  return true;
}, {
  message: "File is required for file resources",
  path: ["file"],
});

const AdminResources = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileUploadStatus, setFileUploadStatus] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { resources, createResource, deleteResource, isLoading } = useData();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "link",
      url: "",
    },
  });

  const resourceType = form.watch("type");

  const uploadFile = async (file: File): Promise<string> => {
    try {
      setFileUploadStatus("Uploading file...");
      
      // Create a unique file name to prevent collisions
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `resources/${fileName}`;
      
      // Upload to Firebase Storage
      const storageReference = ref(storage, filePath);
      const snapshot = await uploadBytes(storageReference, file);
      
      // Get the download URL
      const downloadUrl = await getDownloadURL(snapshot.ref);
      
      setFileUploadStatus("File uploaded successfully!");
      return downloadUrl;
    } catch (error) {
      console.error("Error uploading file:", error);
      setFileUploadStatus("File upload failed!");
      throw new Error("Failed to upload file");
    }
  };

  const addResource = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);
      
      let resourceUrl = values.url || "";
      
      // If it's a file resource, upload the file
      if (values.type === "file" && values.file) {
        resourceUrl = await uploadFile(values.file);
      }
      
      // Use data context to create the resource
      await createResource({
        title: values.title,
        description: values.description,
        url: resourceUrl,
        type: values.type,
      });
      
      toast.success("Resource added successfully");
      setIsAddDialogOpen(false);
      form.reset();
    } catch (error) {
      console.error("Error adding resource:", error);
      toast.error("Failed to add resource");
    } finally {
      setIsSubmitting(false);
      setFileUploadStatus(null);
    }
  };

  const handleDeleteResource = async (id: string) => {
    try {
      await deleteResource(id);
      toast.success("Resource deleted successfully");
    } catch (error) {
      console.error("Error deleting resource:", error);
      toast.error("Failed to delete resource");
    }
  };

  const filteredResources = resources.filter((resource) =>
    resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (resource.description && resource.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Resources</h1>
          <p className="text-muted-foreground">
            Manage shared resources for your clients
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
            <form onSubmit={form.handleSubmit(addResource)} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Resource title"
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
                  placeholder="Resource description"
                  {...form.register("description")}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label>Resource Type</Label>
                <div className="flex space-x-4">
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="link-type"
                      value="link"
                      className="mr-2"
                      {...form.register("type")}
                      checked={resourceType === "link"}
                      onChange={() => form.setValue("type", "link")}
                    />
                    <Label htmlFor="link-type" className="cursor-pointer">Link</Label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="file-type"
                      value="file"
                      className="mr-2"
                      {...form.register("type")}
                      checked={resourceType === "file"}
                      onChange={() => form.setValue("type", "file")}
                    />
                    <Label htmlFor="file-type" className="cursor-pointer">File</Label>
                  </div>
                </div>
                {form.formState.errors.type && (
                  <p className="text-sm text-red-500">{form.formState.errors.type?.message}</p>
                )}
              </div>
              
              {resourceType === "link" ? (
                <div className="space-y-2">
                  <Label htmlFor="url">URL</Label>
                  <Input
                    id="url"
                    placeholder="https://example.com/resource"
                    {...form.register("url")}
                    disabled={isSubmitting}
                  />
                  {form.formState.errors.url && (
                    <p className="text-sm text-red-500">{form.formState.errors.url?.message}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="file">Upload File</Label>
                  <Input
                    id="file"
                    type="file"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        form.setValue("file", e.target.files[0]);
                      }
                    }}
                    disabled={isSubmitting}
                  />
                  {fileUploadStatus && (
                    <p className="text-sm text-blue-500">{fileUploadStatus}</p>
                  )}
                  {form.formState.errors.file && (
                    <p className="text-sm text-red-500">{form.formState.errors.file?.message}</p>
                  )}
                </div>
              )}
              
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
                    "Add Resource"
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
                    <TableHead className="w-[300px]">Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="hidden md:table-cell">Added</TableHead>
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
                          {resource.type === "link" ? (
                            <LinkIcon className="h-4 w-4 mr-2" />
                          ) : (
                            <FileText className="h-4 w-4 mr-2" />
                          )}
                          {resource.type === "link" ? "Link" : "File"}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
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
                            onClick={() => deleteResource(resource.id)}
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
