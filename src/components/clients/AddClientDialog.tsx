
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { v4 as uuidv4, validate as isValidUuid } from 'uuid';

export function AddClientDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [domain, setDomain] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !email) {
      toast.error("Name and email are required");
      return;
    }
    
    if (password && password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Check if we have a valid admin user
      if (!user) {
        console.error("Admin user not found");
        toast.error("Admin authentication failed: Please log in again");
        return;
      }
      
      // Validate admin ID
      if (!user.id) {
        console.error("Admin ID is missing");
        toast.error("Admin authorization failed: Missing admin ID");
        return;
      }
      
      console.log("Admin ID for client creation:", user.id);
      
      // Generate a secure random password if not provided
      const finalPassword = password || Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
      
      // First approach - create client directly with auth user using supabase.auth
      // This uses the Supabase auth API to create a user, which guarantees a valid UUID
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: finalPassword,
        email_confirm: true,
        user_metadata: { role: 'client', name: name }
      });
      
      if (authError) {
        // If admin API fails (requires service role), fall back to RPC function
        console.log("Falling back to RPC function after auth API error:", authError.message);
        
        // Use the RPC function to create both auth user and client record
        const { data, error } = await supabase.rpc('admin_create_client_with_auth', {
          admin_id: user.id,
          client_name: name,
          client_email: email,
          client_password: finalPassword,
          client_company: company || null,
          client_phone: phone || null,
          client_domain: domain || null
        });
        
        if (error) {
          console.error("Error creating client with auth:", error);
          throw new Error(`Failed to create client: ${error.message}`);
        }
        
        console.log("Client created successfully with RPC:", data);
        
        toast.success(`Client ${name} added successfully`);
      } else {
        // Auth API succeeded, now create the client record
        console.log("Auth user created successfully:", authData.user);
        
        // Now create the client record
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .insert({
            name: name,
            email: email,
            company: company || null,
            phone: phone || null,
            domain: domain || null,
            user_id: authData.user.id
          })
          .select()
          .single();
        
        if (clientError) {
          console.error("Error creating client record:", clientError);
          toast.error(`Created auth user but failed to create client record: ${clientError.message}`);
        } else {
          console.log("Client record created successfully:", clientData);
          toast.success(`Client ${name} added successfully`);
        }
      }
      
      // Only show password notification if it was auto-generated
      if (!password) {
        toast.info(`Auto-generated password: ${finalPassword}`, {
          description: "Make sure to save this password before closing",
          duration: 10000,
        });
      }
      
      // Reset the form
      setName("");
      setEmail("");
      setCompany("");
      setPhone("");
      setDomain("");
      setPassword("");
      setOpen(false);
      
      // Force reload to refresh client list
      window.location.reload();
    } catch (error: any) {
      console.error("Add client error:", error);
      toast.error(error.message || "Failed to add client");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" /> Add Client
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Client</DialogTitle>
          <DialogDescription>
            Add a new client to your dashboard. This will create both a client record and
            a user account for portal access.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Company name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="domain">Domain</Label>
            <Input
              id="domain"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="Website domain"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password (Optional)</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank to auto-generate"
            />
            <p className="text-xs text-muted-foreground">
              If left blank, a password will be auto-generated
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
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
      </DialogContent>
    </Dialog>
  );
}
