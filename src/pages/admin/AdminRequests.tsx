
import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { fetchRequestsWithClientInfo, updateRequestStatus } from "@/integrations/supabase/client";
import { Loader2, AlertCircle } from "lucide-react";
import { Request } from "@/lib/models";

const AdminRequests = () => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingRequestId, setUpdatingRequestId] = useState<string | null>(null);

  // Status options for the dropdown
  const statusOptions = [
    { value: "pending", label: "Pending" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
    { value: "rejected", label: "Rejected" },
  ];

  // Load requests when component mounts
  useEffect(() => {
    const loadRequests = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log("Fetching all requests with client info");
        const data = await fetchRequestsWithClientInfo();
        console.log("Received requests:", data);
        
        setRequests(data || []);
      } catch (error) {
        console.error("Error loading requests:", error);
        setError("Failed to load requests. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    loadRequests();
  }, []);

  // Handle status change
  const handleStatusChange = async (requestId: string, newStatus: string) => {
    try {
      setUpdatingRequestId(requestId);
      
      await updateRequestStatus(requestId, newStatus);
      
      // Update local state
      setRequests(prevRequests =>
        prevRequests.map(req =>
          req.id === requestId ? { ...req, status: newStatus } : req
        )
      );
      
      toast.success(`Request status updated to ${newStatus}`);
    } catch (error) {
      console.error("Error updating request status:", error);
      toast.error("Failed to update request status");
    } finally {
      setUpdatingRequestId(null);
    }
  };

  // Helper function to format date
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy h:mm a");
    } catch (error) {
      return "Invalid date";
    }
  };

  // Modified helper function to generate badge variant based on status
  // Using only allowed Badge variants: "default", "destructive", "outline", "secondary"
  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "secondary";
      case "in_progress":
        return "default";
      case "completed":
        return "outline";
      case "rejected":
        return "destructive";
      default:
        return "secondary";
    }
  };

  // Display loading state
  if (isLoading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading requests...</p>
        </div>
      </div>
    );
  }

  // Display error state
  if (error) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="flex flex-col items-center pt-6">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error Loading Requests</h3>
            <p className="text-muted-foreground text-center mb-4">{error}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 container mx-auto py-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Client Requests</h1>
          <p className="text-muted-foreground">
            View and manage all client support requests
          </p>
        </div>
        <Button onClick={() => window.location.reload()}>
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Requests</CardTitle>
          <CardDescription>
            {requests.length} request{requests.length !== 1 ? "s" : ""} in total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              No requests found. Clients will appear here when they submit requests.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Request</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="font-medium">{request.client_name || 'Unknown'}</div>
                      <div className="text-sm text-muted-foreground">{request.client_email || 'Unknown'}</div>
                      {request.client_company && (
                        <div className="text-xs text-muted-foreground">{request.client_company}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{request.title}</div>
                      <div className="text-sm text-muted-foreground line-clamp-2">
                        {request.description}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(request.status)}>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatDate(request.created_at)}
                    </TableCell>
                    <TableCell>
                      {updatingRequestId === request.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Select
                          defaultValue={request.status}
                          onValueChange={(value) => handleStatusChange(request.id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminRequests;
