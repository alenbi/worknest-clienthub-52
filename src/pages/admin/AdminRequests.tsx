
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Check, 
  X, 
  Loader2, 
  Clock, 
  Search,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Request, Client } from "@/lib/models";

// Extended type for requests with client info
interface RequestWithClientInfo extends Request {
  client_name?: string;
  client_email?: string;
  client_company?: string;
}

const AdminRequests = () => {
  const [requests, setRequests] = useState<RequestWithClientInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedRequest, setSelectedRequest] = useState<RequestWithClientInfo | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      
      console.log("Admin: Fetching all requests with client info");
      
      // Use an RPC function to get all requests with client information
      const { data, error } = await supabase
        .rpc('get_all_requests_with_client_info');
      
      if (error) {
        console.error("Error details:", error);
        throw error;
      }
      
      console.log("Admin: Received requests data:", data);
      
      // Set the data directly since the RPC function should return requests with client info
      if (Array.isArray(data)) {
        setRequests(data);
      } else {
        console.error("Unexpected data format:", data);
        setRequests([]);
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error("Failed to load requests");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const filteredRequests = requests.filter((request) => {
    const matchesSearch = 
      request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (request.client_name && request.client_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (request.client_email && request.client_email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (request.client_company && request.client_company.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || request.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "rejected":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const updateRequestStatus = async (status: string) => {
    if (!selectedRequest) return;
    
    try {
      setIsUpdating(true);
      
      // Direct update to the requests table
      const { error } = await supabase
        .from('requests')
        .update({ 
          status, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', selectedRequest.id);
      
      if (error) {
        console.error("Update error details:", error);
        throw error;
      }
      
      toast.success(`Request marked as ${status}`);
      setIsDialogOpen(false);
      fetchRequests();
    } catch (error) {
      console.error("Error updating request:", error);
      toast.error("Failed to update request status");
    } finally {
      setIsUpdating(false);
    }
  };

  const openRequestDetails = (request: RequestWithClientInfo) => {
    setSelectedRequest(request);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Client Requests</h1>
          <p className="text-muted-foreground">
            View and manage requests submitted by clients
          </p>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Input
            placeholder="Search requests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Requests</CardTitle>
          <CardDescription>
            {filteredRequests.length} {filteredRequests.length === 1 ? 'request' : 'requests'} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredRequests.length > 0 ? (
            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-lg border p-4 transition-colors hover:bg-muted/50 cursor-pointer"
                  onClick={() => openRequestDetails(request)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold">{request.title}</h3>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(request.status)}
                      <span className="text-sm font-medium">
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{request.description}</p>
                  
                  <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center text-xs text-muted-foreground">
                    <div className="flex flex-col xs:flex-row gap-1 xs:gap-3">
                      <span>From: <span className="font-medium">{request.client_name || 'Unknown'}</span></span>
                      {request.client_company && (
                        <span className="hidden sm:inline">Company: <span className="font-medium">{request.client_company}</span></span>
                      )}
                      <span className="hidden md:inline">Email: <span className="font-medium">{request.client_email || 'No email'}</span></span>
                    </div>
                    <span className="mt-1 xs:mt-0">Submitted: {formatDate(request.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 space-y-2">
              <Search className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="text-muted-foreground">No requests found matching your filters.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedRequest?.title}</DialogTitle>
            <DialogDescription>
              Request submitted on {selectedRequest?.created_at && formatDate(selectedRequest.created_at)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Client Information</Label>
              <div className="rounded-md bg-muted p-3">
                <p><strong>Name:</strong> {selectedRequest?.client_name || 'Unknown'}</p>
                <p><strong>Email:</strong> {selectedRequest?.client_email || 'No email'}</p>
                {selectedRequest?.client_company && (
                  <p><strong>Company:</strong> {selectedRequest?.client_company}</p>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex items-center gap-2">
                {selectedRequest?.status && getStatusIcon(selectedRequest.status)}
                <span className="font-medium">
                  {selectedRequest?.status?.charAt(0).toUpperCase() + selectedRequest?.status?.slice(1) || 'Unknown'}
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Description</Label>
              <div className="rounded-md bg-muted p-3">
                {selectedRequest?.description}
              </div>
            </div>
            
            {selectedRequest?.status === "pending" && (
              <div className="pt-4">
                <Label>Actions</Label>
                <div className="flex gap-3 mt-2">
                  <Button 
                    onClick={() => updateRequestStatus("completed")}
                    disabled={isUpdating}
                    className="flex-1"
                  >
                    {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                    Mark as Completed
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={() => updateRequestStatus("rejected")}
                    disabled={isUpdating}
                    className="flex-1"
                  >
                    {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
                    Reject
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRequests;
