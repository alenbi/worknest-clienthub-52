
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
import { Plus } from "lucide-react";
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

const DEBUG_CLIENT_CREATION = true;

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
  const [creationStage, setCreationStage] = useState("init");
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
    const oneWeekLater = new Date(today);
    oneWeekLater.setDate(today.getDate() + 7);
    
    const oneMonthLater = new Date(today);
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

  // Function to check if an email exists in auth.users using our RPC function
  // Using type assertion to work around TypeScript checking
  const checkEmailExists = async (email: string): Promise<boolean> => {
    try {
      // Use type assertion to bypass TypeScript checking since our function
      // is not in the Database types yet
      const { data, error } = await (supabase.rpc as any)(
        'check_email_exists',
        { email_to_check: email }
      );
      
      if (error) {
        console.warn("Error checking if email exists:", error);
        return false;
      }
      
      return !!data;
    } catch (error) {
      console.error("Error in checkEmailExists:", error);
      return false;
    }
  };

  async function onSubmit(data: ClientFormValues) {
    try {
      setIsSubmitting(true);
      setCreationStage("starting");
      if (DEBUG_CLIENT_CREATION) console.log("Creating client account for:", data.email);
      
      // Get the current auth user (should be the admin)
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("You must be logged in as an admin to add clients");
      }
      
      setCreationStage("admin-verified");
      if (DEBUG_CLIENT_CREATION) console.log("Admin user creating client:", user.id, user.email);
      
      // First check if a user with this email already exists
      const { data: existingUsers, error: checkError } = await supabase
        .from('clients')
        .select('email')
        .eq('email', data.email)
        .limit(1);
        
      if (checkError) {
        console.error("Error checking for existing client:", checkError);
      }
      
      if (existingUsers && existingUsers.length > 0) {
        throw new Error("A client with this email already exists");
      }
      
      // Check if the email exists in auth.users table
      // This is optional, we'll continue even if this check fails
      setCreationStage("checking-auth-user");
      const emailExists = await checkEmailExists(data.email);
      
      if (emailExists) {
        console.warn("Email already exists in auth.users table");
        throw new Error("An account with this email already exists");
      }
      
      setCreationStage("using-rpc-function");
      // Use the create_client_user function to create the auth user
      if (DEBUG_CLIENT_CREATION) console.log("Using create_client_user function with params:", {
        admin_user_id: user.id,
        client_email: data.email,
        password_length: data.password.length
      });
      
      // Call our RPC function to create the client user
      const { data: newUserId, error: functionError } = await supabase.rpc(
        'create_client_user',
        {
          admin_user_id: user.id,
          client_email: data.email,
          client_password: data.password
        }
      );
      
      if (functionError) {
        console.error("Error from create_client_user:", functionError);
        setCreationStage("rpc-function-error");
        throw new Error(functionError.message || "Failed to create client user account");
      }
      
      if (!newUserId) {
        throw new Error("User creation failed - no user ID returned");
      }
      
      setCreationStage("auth-user-created");
      if (DEBUG_CLIENT_CREATION) {
        console.log("Client auth user created successfully with ID:", newUserId);
        console.log("Now creating client record in clients table...");
      }
      
      // Create the client record linked to the auth user
      const clientData = {
        name: data.name,
        email: data.email,
        phone: data.phone || undefined,
        company: data.company || undefined,
        domain: data.domain || undefined,
        // Link to the auth user ID
        user_id: newUserId
      };
      
      if (DEBUG_CLIENT_CREATION) {
        console.log("Creating client record with data:", clientData);
      }
      
      setCreationStage("creating-client-record");
      const newClient = await addClient(clientData);
      
      setCreationStage("client-record-created");
      if (newClient && newClient.id) {
        // Create default tasks for the new client
        if (DEBUG_CLIENT_CREATION) console.log("Client created, now creating default tasks");
        setCreationStage("creating-default-tasks");
        await createDefaultTasks(newClient.id, newClient.name);
        toast.success("Client added successfully with default tasks");
      } else {
        toast.success("Client added successfully");
      }
      
      // Reset the form and close the dialog
      setCreationStage("completed");
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
            Add a new client to your agency. Fill out the client's information.
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
                    Required for client portal access.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            {DEBUG_CLIENT_CREATION && (
              <div className="text-xs text-muted-foreground">
                <p>Creation stage: {creationStage}</p>
                <p>Submitting: {isSubmitting ? 'Yes' : 'No'}</p>
              </div>
            )}
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Adding..." : "Add Client"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
