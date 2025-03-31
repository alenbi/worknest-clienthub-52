
import { useState } from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Key } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useData, Client } from "@/contexts/data-context";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ChangePasswordDialogProps extends ButtonProps {
  client: Client;
}

export function ChangePasswordDialog({ client, ...props }: ChangePasswordDialogProps) {
  const [open, setOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { updateClientPassword } = useData();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Check if the client has a user_id
      if (!client.user_id) {
        toast.error("This client doesn't have a user account");
        return;
      }
      
      // If updateClientPassword exists in the context, use it
      if (updateClientPassword) {
        await updateClientPassword(client.id, newPassword);
      } else {
        // Direct implementation fallback if context function doesn't exist
        try {
          // Get user_id from client
          const { data: userData, error: userError } = await supabase
            .from("clients")
            .select("user_id")
            .eq("id", client.id)
            .single();
            
          if (userError || !userData.user_id) {
            throw new Error("Could not find user account for this client");
          }
          
          // Update password via Supabase Auth Admin API
          const { error: pwError } = await supabase.auth.admin.updateUserById(userData.user_id, {
            password: newPassword
          });
          
          if (pwError) throw pwError;
        } catch (error: any) {
          console.error("Error updating password:", error);
          throw error;
        }
      }
      
      toast.success("Password updated successfully");
      setNewPassword("");
      setConfirmPassword("");
      setOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update password");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button {...props}>
          <Key className="mr-2 h-4 w-4" /> Change Password
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>
            Update the password for {client.name}'s client portal
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              disabled={isSubmitting}
              required
            />
            <p className="text-sm text-muted-foreground">
              Password must be at least 6 characters
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              disabled={isSubmitting}
              required
            />
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
              {isSubmitting ? "Updating..." : "Update Password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
