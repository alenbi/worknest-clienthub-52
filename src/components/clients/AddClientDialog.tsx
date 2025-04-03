
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

const clientFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  company: z.string().optional(),
  domain: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

export function AddClientDialog() {
  const [open, setOpen] = useState(false);
  const { addClient, addTask } = useData();

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

  async function onSubmit(data: ClientFormValues) {
    try {
      // Convert form data to match Client type requirements
      const clientData = {
        name: data.name,
        email: data.email,
        phone: data.phone || undefined,
        company: data.company || undefined,
        domain: data.domain || undefined,
        password: data.password
      };
      
      const newClient = await addClient!(clientData);
      
      if (newClient && newClient.id) {
        // Create default tasks for the new client
        await createDefaultTasks(newClient.id, newClient.name);
        toast.success("Client added successfully with default tasks");
      } else {
        toast.success("Client added successfully");
      }
      
      form.reset();
      setOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to add client");
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
                    />
                  </FormControl>
                  <FormDescription>
                    Optional. Used for client portal access.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Adding..." : "Add Client"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
