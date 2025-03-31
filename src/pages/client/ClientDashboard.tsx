
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, BarChart } from "@/components/ui/chart";
import { useClientAuth } from "@/contexts/client-auth-context";
import { supabase } from "@/integrations/supabase/client";

const ClientDashboard = () => {
  const { client } = useClientAuth();
  const [taskStats, setTaskStats] = useState({
    completed: 0,
    pending: 0,
  });

  useEffect(() => {
    const fetchTaskStats = async () => {
      if (!client?.id) return;

      try {
        // Get completed tasks count
        const { count: completedCount, error: completedError } = await supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("client_id", client.id)
          .eq("status", "completed");

        if (completedError) throw completedError;

        // Get pending tasks count
        const { count: pendingCount, error: pendingError } = await supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("client_id", client.id)
          .neq("status", "completed");

        if (pendingError) throw pendingError;

        setTaskStats({
          completed: completedCount || 0,
          pending: pendingCount || 0,
        });
      } catch (error) {
        console.error("Error fetching task stats:", error);
      }
    };

    fetchTaskStats();
  }, [client]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome, {client?.name || "Client"}
        </h1>
        <p className="text-muted-foreground">
          Here's an overview of your project status
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Tasks Status</CardTitle>
          </CardHeader>
          <CardContent>
            <PieChart
              data={{
                labels: ["Completed", "Pending"],
                datasets: [
                  {
                    data: [taskStats.completed, taskStats.pending],
                    backgroundColor: ["#16a34a", "#f59e0b"],
                  },
                ],
              }}
              options={{
                plugins: {
                  legend: {
                    position: "bottom",
                  },
                },
                maintainAspectRatio: false,
              }}
              className="h-80"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Project Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center h-80">
              <div className="text-6xl font-bold text-primary">
                {taskStats.completed + taskStats.pending > 0
                  ? Math.round(
                      (taskStats.completed /
                        (taskStats.completed + taskStats.pending)) *
                        100
                    )
                  : 0}
                %
              </div>
              <div className="text-muted-foreground mt-2">Completed</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClientDashboard;
