
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useData } from "@/contexts/data-context";
import { Eye, Trash2 } from "lucide-react";
import { AddClientDialog } from "@/components/clients/AddClientDialog";
import { ChangePasswordDialog } from "@/components/clients/ChangePasswordDialog";

export default function Clients() {
  const { clients, deleteClient, isLoading } = useData();
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.company?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleViewClient = (id: string) => {
    navigate(`/clients/${id}`);
  };

  const handleDeleteClient = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this client? This action cannot be undone.")) {
      await deleteClient(id);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Clients</h1>
        <AddClientDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Manage Clients</CardTitle>
          <CardDescription>
            View and manage all your clients in one place.
          </CardDescription>
          <div className="mt-4">
            <Input
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6">
                    Loading clients...
                  </TableCell>
                </TableRow>
              ) : filteredClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6">
                    No clients found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <Avatar>
                        <AvatarImage src={client.avatar} alt={client.name} />
                        <AvatarFallback>
                          {client.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>{client.email}</TableCell>
                    <TableCell>{client.company || "-"}</TableCell>
                    <TableCell>{client.domain || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <ChangePasswordDialog client={client} variant="outline" />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewClient(client.id)}
                        >
                          <Eye className="mr-2 h-4 w-4" /> View
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteClient(client.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
