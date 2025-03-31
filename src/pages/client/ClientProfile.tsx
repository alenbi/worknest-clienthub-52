
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useClientAuth } from "@/contexts/client-auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Client } from "@/lib/models";

const ClientProfile = () => {
  const { user } = useClientAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClient = async () => {
      try {
        if (!user?.id) return;

        const { data, error } = await supabase
          .from("clients")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (error) {
          throw error;
        }

        setClient(data);
      } catch (error) {
        console.error("Error fetching client profile:", error);
        toast.error("Failed to load profile data");
      } finally {
        setLoading(false);
      }
    };

    fetchClient();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Your Profile</h1>
        <p className="text-muted-foreground">
          View your account information
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Name
                  </div>
                  <div>{client.name}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Email
                  </div>
                  <div>{client.email}</div>
                </div>

                {client.phone && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Phone
                    </div>
                    <div>{client.phone}</div>
                  </div>
                )}

                {client.company && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Company
                    </div>
                    <div>{client.company}</div>
                  </div>
                )}
                
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Client Since
                  </div>
                  <div>{format(new Date(client.created_at), "MMMM d, yyyy")}</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientProfile;
