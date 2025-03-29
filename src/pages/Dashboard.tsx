
import { useAuth } from "@/contexts/auth-context";
import { useData } from "@/contexts/data-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2, Clock, ListTodo, UserRound } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from "chart.js";
import { Pie, Bar } from "react-chartjs-2";

// Register ChartJS components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

const Dashboard = () => {
  const { user } = useAuth();
  const { clients, tasks, isLoading } = useData();
  const [timeframe, setTimeframe] = useState<"week" | "month" | "year">("week");

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // Count tasks by status
  const todoTasks = tasks.filter((task) => task.status === "todo");
  const inProgressTasks = tasks.filter((task) => task.status === "in-progress");
  const completedTasks = tasks.filter((task) => task.status === "completed");

  // Count high priority tasks
  const highPriorityTasks = tasks.filter((task) => task.priority === "high");
  
  // Calculate overdue tasks
  const overdueTasks = tasks.filter(
    (task) => new Date(task.dueDate) < new Date() && task.status !== "completed"
  );

  // Calculate completion rate
  const completionRate = tasks.length > 0
    ? Math.round((completedTasks.length / tasks.length) * 100)
    : 0;

  // Prepare data for task status pie chart
  const statusChartData = {
    labels: ["To-Do", "In Progress", "Completed"],
    datasets: [
      {
        data: [todoTasks.length, inProgressTasks.length, completedTasks.length],
        backgroundColor: ["#f97316", "#3b82f6", "#10b981"],
        borderColor: ["#f97316", "#3b82f6", "#10b981"],
        borderWidth: 1,
      },
    ],
  };

  // Prepare data for task priority bar chart
  const priorityChartData = {
    labels: ["Low", "Medium", "High"],
    datasets: [
      {
        label: "Tasks by Priority",
        data: [
          tasks.filter((task) => task.priority === "low").length,
          tasks.filter((task) => task.priority === "medium").length,
          tasks.filter((task) => task.priority === "high").length,
        ],
        backgroundColor: ["#6366f1", "#f59e0b", "#ef4444"],
      },
    ],
  };

  // Tasks due soon (next 7 days)
  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);
  
  const upcomingTasks = tasks
    .filter(
      (task) => 
        new Date(task.dueDate) > today && 
        new Date(task.dueDate) <= nextWeek && 
        task.status !== "completed"
    )
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);

  // Recently completed tasks
  const recentlyCompletedTasks = tasks
    .filter((task) => task.status === "completed")
    .sort((a, b) => 
      (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0)
    )
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between space-y-2 md:flex-row md:items-center md:space-y-0">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center space-x-2">
          <p className="text-sm text-muted-foreground">
            Welcome back, <span className="font-medium text-foreground">{user?.name}</span>
          </p>
        </div>
      </div>

      {/* Stats overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <UserRound className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clients.length}</div>
            <p className="text-xs text-muted-foreground">
              Active client projects
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate}%</div>
            <div className="mt-1 h-2 w-full rounded-full bg-secondary">
              <div
                className="h-2 rounded-full bg-primary"
                style={{ width: `${completionRate}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {todoTasks.length + inProgressTasks.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Tasks in progress or to-do
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overdueTasks.length}</div>
            <p className="text-xs text-muted-foreground">
              Tasks past their due date
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Task Status</CardTitle>
            <CardDescription>
              Distribution of tasks by current status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full flex justify-center">
              <Pie data={statusChartData} options={{ maintainAspectRatio: false }} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tasks by Priority</CardTitle>
            <CardDescription>
              Distribution of tasks by priority level
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <Bar
                data={priorityChartData}
                options={{
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        precision: 0,
                      },
                    },
                  },
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task lists */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Deadlines</CardTitle>
            <CardDescription>
              Tasks due in the next 7 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingTasks.length > 0 ? (
              <div className="space-y-4">
                {upcomingTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div>
                      <div className="font-medium">{task.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {clients.find((c) => c.id === task.clientId)?.name}
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className={`mr-2 h-2 w-2 rounded-full ${
                        task.priority === 'high' 
                          ? 'bg-destructive' 
                          : task.priority === 'medium' 
                            ? 'bg-warning' 
                            : 'bg-info'
                      }`}></div>
                      <div className="flex items-center text-sm">
                        <Clock className="mr-1 h-3 w-3" />
                        {format(new Date(task.dueDate), "MMM d")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-[100px] items-center justify-center rounded-md border border-dashed">
                <p className="text-sm text-muted-foreground">
                  No upcoming deadlines
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Recently Completed</CardTitle>
            <CardDescription>
              Tasks completed recently
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentlyCompletedTasks.length > 0 ? (
              <div className="space-y-4">
                {recentlyCompletedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div>
                      <div className="font-medium">{task.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {clients.find((c) => c.id === task.clientId)?.name}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {task.completedAt && format(new Date(task.completedAt), "MMM d")}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-[100px] items-center justify-center rounded-md border border-dashed">
                <p className="text-sm text-muted-foreground">
                  No completed tasks
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
