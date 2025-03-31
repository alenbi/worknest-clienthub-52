
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Clock, AlertTriangle, ListTodo, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClientAuth } from "@/contexts/client-auth-context";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const ClientDashboard = () => {
  const { user } = useClientAuth();
  const [clientId, setClientId] = useState<string | null>(null);
  const [taskStats, setTaskStats] = useState({
    completed: 0,
    pending: 0,
    overdue: 0,
    total: 0
  });
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [clientName, setClientName] = useState(user?.name || "Client");
  const [latestOffers, setLatestOffers] = useState<any[]>([]);
  const [upcomingMilestones, setUpcomingMilestones] = useState<any[]>([]);

  // Fetch client ID based on user ID
  useEffect(() => {
    const fetchClientId = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from("clients")
          .select("id, name")
          .eq("user_id", user.id)
          .single();
        
        if (error) throw error;
        
        if (data) {
          setClientId(data.id);
          if (data.name) setClientName(data.name);
        }
      } catch (error) {
        console.error("Error fetching client ID:", error);
      }
    };

    if (user) {
      fetchClientId();
    }
  }, [user]);

  // Fetch client data (tasks and messages) directly from Supabase
  useEffect(() => {
    const fetchClientData = async () => {
      if (!clientId) return;

      setIsLoading(true);
      try {
        // Get tasks directly from Supabase with RLS applied
        const { data: tasksData, error: tasksError } = await supabase
          .from("tasks")
          .select("*")
          .eq("client_id", clientId);

        if (tasksError) throw tasksError;
        
        const tasks = tasksData || [];
        const completedTasks = tasks.filter(task => task.status === 'completed');
        const pendingTasks = tasks.filter(task => task.status !== 'completed');
        const overdueTasks = pendingTasks.filter(task => new Date(task.due_date) < new Date());
        
        setTaskStats({
          completed: completedTasks.length,
          pending: pendingTasks.length,
          overdue: overdueTasks.length,
          total: tasks.length
        });

        // Get recent tasks
        const sortedTasks = [...tasks].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setRecentTasks(sortedTasks.slice(0, 5));

        // Get unread messages count
        const { count: unreadCount, error: messagesError } = await supabase
          .from("client_messages")
          .select("*", { count: "exact", head: true })
          .eq("client_id", clientId)
          .eq("is_from_client", false)
          .eq("is_read", false);

        if (messagesError) throw messagesError;
        setUnreadMessages(unreadCount || 0);
        
        // Get latest offers
        const { data: offersData, error: offersError } = await supabase
          .from("offers")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(2);
          
        if (offersError) throw offersError;
        
        // Format the offers data
        const formattedOffers = (offersData || []).map(offer => ({
          id: offer.id,
          title: offer.title,
          discount: offer.discount_percentage ? `${offer.discount_percentage}%` : null,
          expires: new Date(offer.valid_until)
        }));
        
        setLatestOffers(formattedOffers);
        
        // Mock data for milestones (would typically come from a real table in production)
        setUpcomingMilestones([
          { id: 1, title: "Project Phase 1 Completion", date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
          { id: 2, title: "Website Launch", date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) }
        ]);

      } catch (error) {
        console.error("Error fetching client data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClientData();
  }, [clientId]);

  // Prepare data for chart
  const chartData = [
    { name: "Completed", value: taskStats.completed, color: "#10b981" },
    { name: "In Progress", value: taskStats.pending - taskStats.overdue, color: "#3b82f6" },
    { name: "Overdue", value: taskStats.overdue, color: "#ef4444" },
  ].filter(item => item.value > 0);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome section with personalized greeting */}
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-6">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {clientName}
        </h1>
        <p className="text-muted-foreground mt-2">
          Here's an overview of your project status and upcoming activities
        </p>
      </div>

      {/* Main stats in a more visually distinct layout */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="text-2xl font-bold">{taskStats.total}</div>
              <ListTodo className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="text-2xl font-bold">{taskStats.completed}</div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="text-2xl font-bold">{taskStats.pending - taskStats.overdue}</div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="text-2xl font-bold">{taskStats.overdue}</div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Project Timeline Section */}
        <Card>
          <CardHeader>
            <CardTitle>Project Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingMilestones.length > 0 ? (
              <div className="space-y-4">
                {upcomingMilestones.map((milestone) => (
                  <div key={milestone.id} className="flex items-center space-x-4">
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{milestone.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(milestone.date, "MMM dd, yyyy")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-[200px] items-center justify-center">
                <p className="text-muted-foreground">No upcoming milestones</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Task Overview Chart */}
        {taskStats.total > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Task Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => 
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Task Overview</CardTitle>
            </CardHeader>
            <CardContent className="flex h-[250px] items-center justify-center text-muted-foreground">
              No tasks assigned yet
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Tasks Section */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center">
              <ListTodo className="mr-2 h-5 w-5 text-primary" />
              Recent Tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {recentTasks.length > 0 ? (
              <div className="space-y-4">
                {recentTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between rounded-md p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center">
                      {task.status === "completed" ? (
                        <CheckCircle className="h-5 w-5 mr-3 text-green-500" />
                      ) : new Date(task.due_date) < new Date() ? (
                        <AlertTriangle className="h-5 w-5 mr-3 text-red-500" />
                      ) : (
                        <Clock className="h-5 w-5 mr-3 text-blue-500" />
                      )}
                      <div>
                        <div className="font-medium">{task.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {task.due_date && format(new Date(task.due_date), "MMM d")}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-[200px] items-center justify-center rounded-md border border-dashed">
                <p className="text-sm text-muted-foreground">
                  No recent tasks
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Latest Offers */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center">
              <MessageSquare className="mr-2 h-5 w-5 text-primary" />
              Special Offers
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {latestOffers.length > 0 ? (
              <div className="space-y-4">
                {latestOffers.map((offer) => (
                  <div
                    key={offer.id}
                    className="rounded-md border border-primary/20 bg-primary/5 p-4"
                  >
                    <div className="font-medium text-primary">{offer.title}</div>
                    <div className="mt-1 flex items-center justify-between">
                      {offer.discount && <div className="text-sm">Save {offer.discount}</div>}
                      <div className="text-xs text-muted-foreground">
                        Expires {format(offer.expires, "MMM d, yyyy")}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="mt-2 w-full">
                      View Details
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-[200px] items-center justify-center rounded-md border border-dashed">
                <p className="text-sm text-muted-foreground">
                  No special offers available
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {unreadMessages > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center">
              <MessageSquare className="h-5 w-5 mr-2 text-primary" />
              <span>You have {unreadMessages} unread message{unreadMessages > 1 ? 's' : ''}</span>
            </div>
            <Button size="sm" variant="outline" onClick={() => window.location.href = '/client/chat'}>
              View Messages
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClientDashboard;
