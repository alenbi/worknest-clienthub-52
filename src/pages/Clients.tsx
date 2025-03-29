
import { useState } from "react";
import { Link } from "react-router-dom";
import { useData, Client } from "@/contexts/data-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Plus, MoreHorizontal, Trash, Edit, ExternalLink } from "lucide-react";

const Clients = () => {
  const { clients, tasks, addClient, deleteClient, isLoading } = useData();
  const [searchQuery, setSearchQuery] = useState("");
  const [newClient, setNewClient] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
  });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.company.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getClientTaskCount = (clientId: string) => {
    return tasks.filter((task) => task.clientId === clientId).length;
  };

  const getClientActiveTasks = (clientId: string) => {
    return tasks.filter(
      (task) => task.clientId === clientId && task.status !== "completed"
    ).length;
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const handleAddClient = async () => {
    await addClient(newClient);
    setNewClient({
      name: "",
      email: "",
      phone: "",
      company: "",
    });
    setIsAddDialogOpen(false);
  };

  const handleDeleteClient = async (clientId: string) => {
    await deleteClient(clientId);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between space-y-4 md:flex-row md:items-center md:space-y-0">
        <h2 className="text-3xl font-bold tracking-tight">Clients</h2>
        <div className="flex flex-col space-y-2 sm:flex-row sm:space-x-2 sm:space-y-0">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search clients..."
              className="w-full pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Client
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Client</DialogTitle>
                <DialogDescription>
                  Fill in the details to add a new client.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="name">
                    Name
                  </label>
                  <Input
                    id="name"
                    placeholder="Client name"
                    value={newClient.name}
                    onChange={(e) =>
                      setNewClient((prev) => ({ ...prev, name: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="email">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="client@example.com"
                    value={newClient.email}
                    onChange={(e) =>
                      setNewClient((prev) => ({ ...prev, email: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="phone">
                    Phone
                  </label>
                  <Input
                    id="phone"
                    placeholder="(555) 123-4567"
                    value={newClient.phone}
                    onChange={(e) =>
                      setNewClient((prev) => ({ ...prev, phone: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="company">
                    Company
                  </label>
                  <Input
                    id="company"
                    placeholder="Company name"
                    value={newClient.company}
                    onChange={(e) =>
                      setNewClient((prev) => ({ ...prev, company: e.target.value }))
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddClient}>Add Client</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredClients.map((client) => (
          <Card key={client.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex justify-between">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={client.avatar} alt={client.name} />
                    <AvatarFallback>{getInitials(client.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle>{client.name}</CardTitle>
                    <CardDescription>{client.company}</CardDescription>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to={`/clients/${client.id}`}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDeleteClient(client.id)}
                      className="text-destructive"
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="truncate max-w-[180px]">{client.email}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Phone:</span>
                  <span>{client.phone}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Client since:</span>
                  <span>{format(new Date(client.createdAt), "MMM d, yyyy")}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t bg-muted/50 px-6 py-3">
              <div className="flex w-full justify-between text-sm">
                <div>
                  <span className="font-medium">{getClientTaskCount(client.id)}</span>
                  <span className="ml-1 text-muted-foreground">Total tasks</span>
                </div>
                <div>
                  <span className="font-medium">{getClientActiveTasks(client.id)}</span>
                  <span className="ml-1 text-muted-foreground">Active</span>
                </div>
              </div>
            </CardFooter>
          </Card>
        ))}
        
        {filteredClients.length === 0 && (
          <div className="col-span-full flex min-h-[200px] items-center justify-center rounded-lg border border-dashed">
            <div className="text-center">
              <p className="text-lg font-medium">No clients found</p>
              <p className="text-sm text-muted-foreground">
                {searchQuery 
                  ? "Try adjusting your search query" 
                  : "Add your first client to get started"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Clients;
