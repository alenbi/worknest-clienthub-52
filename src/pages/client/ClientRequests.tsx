
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useClientAuth } from "@/contexts/client-auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Request } from "@/lib/models";

const ClientRequests = () => {
  const { user } = useClientAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requests, setRequests] = useState<Request[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [clientId, setClientId] = useState<string | null>(null);

  // First get the client's ID from their user ID
  useEffect(() => {
    const fetchClientId = async () => {
      if (!user?.id) return;
      
      try {
        console.log("Fetching client ID for user:", user.id);
        const { data, error } = await supabase
          .rpc('get_client_id_from_user', { user_id: user.id });
        
        if (error) {
          console.error("Error fetching client ID:", error);
          throw error;
        }
        
        console.log("Received client ID:", data);
        setClientId(data);
      } catch (error) {
        console.error("Error in fetchClientId:", error);
        toast.error("Failed to load your profile information");
      }
    };
    
    if (user?.id) {
      fetchClientId();
    }
  }, [user?.id]);

  // Then fetch the client's requests using their client ID
  useEffect(() => {
    const fetchRequests = async () => {
      if (!clientId) return;
      
      try {
        setIsLoading(true);
        console.log("Fetching requests for client ID:", clientId);
        
        // Directly query the requests table for this client
        const { data, error } = await supabase
          .from('requests')
          .select('*')
          .eq('client_id', clientId);
        
        if (error) throw error;
        
        console.log("Received requests:", data);
        setRequests(data || []);
      } catch (error) {
        console.error("Error fetching requests:", error);
        toast.error("Failed to load your requests");
      } finally {
        setIsLoading(false);
      }
    };
    
    if (clientId) {
      fetchRequests();
    }
  }, [clientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !description.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      if (!clientId) {
        toast.error("Your account information could not be found");
        return;
      }
      
      console.log("Creating request with client ID:", clientId);
      
      // Insert directly into the requests table
      const { error } = await supabase
        .from('requests')
        .insert({
          title, 
          description, 
          client_id: clientId,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
      
      toast.success("Request submitted successfully");
      setTitle("");
      setDescription("");
      
      // Refresh requests list
      const { data, error: fetchError } = await supabase
        .from('requests')
        .select('*')
        .eq('client_id', clientId);
        
      if (fetchError) throw fetchError;
      
      setRequests(data || []);
      
    } catch (error) {
      console.error("Error submitting request:", error);
      toast.error("Failed to submit request");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  // Get status color class
  const getStatusClass = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Submit a Request</h1>
        <p className="text-muted-foreground">
          Submit a new request or view your existing requests
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>New Request</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Request Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter request title"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your request in detail"
                rows={5}
                required
              />
            </div>
            
            <Button type="submit" className="w-full" disabled={isSubmitting || !clientId}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Request"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Your Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : requests.length > 0 ? (
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-lg border p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold">{request.title}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClass(request.status)}`}>
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{request.description}</p>
                  <p className="text-xs text-muted-foreground">
                    Submitted on {formatDate(request.created_at)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">You haven't submitted any requests yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientRequests;
