
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Loader2 } from "lucide-react";
import { useData } from "@/contexts/data-context";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { TaskStatus, TaskPriority } from "@/lib/models";
import { supabase } from "@/integrations/supabase/client";

const clientFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  company: z.string().optional(),
  domain: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

export function AddClientDialog() {
  const [open, setOpen] = useState(false);
  const { addClient, addTask } = useData();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      company: "",
      domain: "",
      password: "",
    },
  });

  const createDefaultTasks = async (clientId: string, clientName: string) => {
    const today = new Date();
    const oneWeekLater = new Date();
    oneWeekLater.setDate(today.getDate() + 7);
    
    const oneMonthLater = new Date();
    oneMonthLater.setMonth(today.getMonth() + 1);
    
    const defaultTasks = [
      {
        title: "Initial onboarding call",
        description: `Schedule a welcome call with ${clientName}`,
        due_date: new Date(today.setDate(today.getDate() + 2)).toISOString(),
        priority: TaskPriority.HIGH,
        status: TaskStatus.TODO,
        client_id: clientId
      },
      {
        title: "Client website review",
        description: `Complete a review of ${clientName}'s existing website`,
        due_date: oneWeekLater.toISOString(),
        priority: TaskPriority.MEDIUM,
        status: TaskStatus.TODO,
        client_id: clientId
      },
      {
        title: "Develop marketing strategy",
        description: `Create a marketing plan for ${clientName}`,
        due_date: oneMonthLater.toISOString(),
        priority: TaskPriority.MEDIUM,
        status: TaskStatus.TODO,
        client_id: clientId
      }
    ];
    
    console.log("Creating default tasks for client:", clientId);
    
    try {
      for (const task of defaultTasks) {
        await addTask(task);
      }
      console.log("Default tasks created successfully");
    } catch (error) {
      console.error("Error creating default tasks:", error);
      toast.error("Failed to create default tasks");
    }
  };

  async function onSubmit(data: ClientFormValues) {
    try {
      setIsSubmitting(true);
      console.log("Creating client with auth access for:", data.email);
      
      // Get the current user with robust validation
      const { data: authData, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error("Error getting current user:", authError);
        throw new Error("Authentication error: " + authError.message);
      }
      
      if (!authData || !authData.user || !authData.user.id) {
        console.error("No valid user data found:", authData);
        throw new Error("You must be logged in with a valid admin account");
      }
      
      const adminId = authData.user.id;
      
      // Extra validation to ensure UUID is valid
      if (!adminId || typeof adminId !== 'string' || adminId.trim() === '') {
        console.error("Invalid admin ID:", adminId);
        throw new Error("Invalid admin ID format");
      }
      
      console.log("Admin ID (validated):", adminId);
      
      // Create a function parameters object to ensure all properties are properly passed
      const params = {
        admin_id: adminId,
        client_name: data.name,
        client_email: data.email,
        client_password: data.password,
        client_company: data.company || null,
        client_phone: data.phone || null,
        client_domain: data.domain || null
      };
      
      console.log("Calling RPC with parameters:", params);
      
      // Make the RPC call with validated parameters
      const { data: result, error } = await supabase.rpc('admin_create_client_with_auth', params);
      
      if (error) {
        console.error("Error creating client with auth:", error);
        throw new Error(error.message || "Failed to create client");
      }
      
      console.log("Raw RPC result:", result);
      
      if (!result) {
        throw new Error("No result returned from client creation");
      }
      
      // Validate the result structure with detailed logging
      if (typeof result !== 'object') {
        console.error("Result is not an object:", result);
        throw new Error("Invalid response format: not an object");
      }
      
      const clientId = result.client_id;
      const userId = result.user_id;
      
      console.log("Extracted clientId:", clientId, "type:", typeof clientId);
      console.log("Extracted userId:", userId, "type:", typeof userId);
      
      if (!clientId || !userId) {
        console.error("Missing IDs in result:", result);
        throw new Error("Invalid response: missing client_id or user_id");
      }
      
      // Add client to the context
      try {
        await addClient({
          id: clientId,
          name: data.name,
          email: data.email,
          phone: data.phone,
          company: data.company,
          domain: data.domain,
          user_id: userId
        });
        
        await createDefaultTasks(clientId, data.name);
        toast.success("Client added successfully with login credentials and default tasks");
      } catch (addError: any) {
        console.error("Error after client creation:", addError);
        toast.error("Client was created but there was an error setting up additional data: " + (addError.message || "Unknown error"));
      }
      
      form.reset();
      setOpen(false);
    } catch (error: any) {
      console.error("Error adding client:", error);
      toast.error(error.message || "Failed to add client");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Client
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Client</DialogTitle>
          <DialogDescription>
            Add a new client to your agency. Fill out the client's information and create their login credentials.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Client name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="Email address" {...field} />
                  </FormControl>
                  <FormDescription>
                    This email will be used for client portal login
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="Phone number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="company"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company</FormLabel>
                  <FormControl>
                    <Input placeholder="Company name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="domain"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Domain</FormLabel>
                  <FormControl>
                    <Input placeholder="Website domain" {...field} />
                  </FormControl>
                  <FormDescription>
                    Domain used for the client portal, e.g. "example.com"
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Create a password"
                      {...field}
                      required
                    />
                  </FormControl>
                  <FormDescription>
                    Password for client portal access. Must be at least 6 characters.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Client"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
