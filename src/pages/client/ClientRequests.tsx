
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useClientAuth } from "@/contexts/client-auth-context";
import { toast } from "sonner";
import { Loader2, AlertCircle } from "lucide-react";
import { Request } from "@/lib/models";
import { supabase, fetchClientRequests, createClientRequest } from "@/integrations/supabase/client";

const ClientRequests = () => {
  const { user } = useClientAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requests, setRequests] = useState<Request[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);

  // Fetch client ID when component mounts
  useEffect(() => {
    const fetchClientId = async () => {
      if (!user?.id) return;
      
      try {
        console.log("Fetching client ID for user:", user.id);
        
        const { data, error } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', user.id)
          .single();
        
        if (error) {
          console.error("Error fetching client ID:", error);
          setLoadError("Failed to find your client information");
          throw error;
        }
        
        console.log("Received client ID:", data?.id);
        if (data?.id) {
          setClientId(data.id);
        } else {
          setLoadError("No client profile found for your account");
        }
      } catch (error) {
        console.error("Error in fetchClientId:", error);
        setLoadError("Failed to load your profile information");
      } finally {
        if (!clientId) {
          setIsLoading(false);
        }
      }
    };
    
    if (user?.id) {
      fetchClientId();
    }
  }, [user?.id]);

  // Fetch requests when client ID is available
  useEffect(() => {
    const loadRequests = async () => {
      if (!clientId) return;
      
      try {
        setIsLoading(true);
        setLoadError(null);
        console.log("Fetching requests for client ID:", clientId);
        
        const data = await fetchClientRequests(clientId);
        console.log("Received requests:", data);
        setRequests(data || []);
      } catch (error) {
        console.error("Error fetching requests:", error);
        setLoadError("Failed to load your requests. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };
    
    if (clientId) {
      loadRequests();
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
      
      await createClientRequest(clientId, title, description);
      
      toast.success("Request submitted successfully");
      setTitle("");
      setDescription("");
      
      // Refresh the requests list
      const refreshedData = await fetchClientRequests(clientId);
      setRequests(refreshedData);
      
    } catch (error: any) {
      console.error("Error submitting request:", error);
      toast.error("Failed to submit request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

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

  // Handle error state
  if (loadError && !isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Submit a Request</h1>
          <p className="text-muted-foreground">
            Submit a new request or view your existing requests
          </p>
        </div>
        
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error Loading Requests</h3>
            <p className="text-muted-foreground text-center mb-4">{loadError}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
