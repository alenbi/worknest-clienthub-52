
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useData } from "@/contexts/data-context";
import { Plus } from "lucide-react";
import { toast } from "sonner";

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  phone: z.string().optional(),
  company: z.string().optional(),
  domain: z.string().optional(),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }).optional(),
});

export function AddClientDialog() {
  const { addClient } = useData();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      company: "",
      domain: "",
      password: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    setGeneratedPassword(null);
    
    try {
      const result = await addClient({
        name: values.name,
        email: values.email,
        phone: values.phone || "",
        company: values.company || "",
        domain: values.domain,
        password: values.password,
      });
      
      // Store the generated password to display to admin
      setGeneratedPassword(result.password);
      
      // Don't close dialog yet if we need to show the generated password
      if (!values.password) {
        toast.success("Client added successfully!");
      } else {
        // If admin provided a password, we can close the dialog
        form.reset();
        setOpen(false);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to add client");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setGeneratedPassword(null);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Add Client
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Client</DialogTitle>
          <DialogDescription>
            Create a new client account. The client will receive credentials to log in.
          </DialogDescription>
        </DialogHeader>
        
        {generatedPassword ? (
          <div className="space-y-4">
            <div className="flex flex-col space-y-2">
              <h3 className="font-medium">Client Added Successfully!</h3>
              <p className="text-sm text-muted-foreground">
                Please share these credentials with the client:
              </p>
              <div className="rounded-md bg-muted p-4">
                <p><strong>Email:</strong> {form.getValues("email")}</p>
                <p><strong>Password:</strong> {generatedPassword}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Make sure to copy this information as it won't be shown again.
              </p>
            </div>
            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
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
                      <Input type="email" placeholder="john@example.com" {...field} />
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
                      <Input placeholder="+1 (555) 123-4567" {...field} />
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
                      <Input placeholder="Acme Inc." {...field} />
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
                    <FormLabel>Website Domain</FormLabel>
                    <FormControl>
                      <Input placeholder="example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Leave blank to auto-generate" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Adding..." : "Add Client"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
