import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { apiClient } from "../lib/api";
import type { ActivityWithDetails } from "../lib/api";
import { Users, Building2, TrendingUp, Calendar } from "lucide-react";

interface DashboardStats {
  contacts: number;
  companies: number;
  deals: number;
  activities: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    contacts: 0,
    companies: 0,
    deals: 0,
    activities: 0,
  });
  const [upcomingActivities, setUpcomingActivities] = useState<
    ActivityWithDetails[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);

      try {
        // Fetch counts for each entity
        const [
          contactsRes,
          companiesRes,
          dealsRes,
          activitiesRes,
          upcomingRes,
        ] = await Promise.all([
          apiClient.getContacts({ limit: 1 }),
          apiClient.getCompanies({ limit: 1 }),
          apiClient.getDeals({ limit: 1 }),
          apiClient.getActivities({ limit: 1 }),
          apiClient.getUpcomingActivities(),
        ]);

        setStats({
          contacts: contactsRes.data?.pagination.total || 0,
          companies: companiesRes.data?.pagination.total || 0,
          deals: dealsRes.data?.pagination.total || 0,
          activities: activitiesRes.data?.pagination.total || 0,
        });

        if (upcomingRes.data) {
          setUpcomingActivities(upcomingRes.data);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const statsCards = [
    {
      title: "Total Contacts",
      value: stats.contacts,
      icon: Users,
      color: "text-blue-600",
    },
    {
      title: "Total Companies",
      value: stats.companies,
      icon: Building2,
      color: "text-green-600",
    },
    {
      title: "Active Deals",
      value: stats.deals,
      icon: TrendingUp,
      color: "text-purple-600",
    },
    {
      title: "Total Activities",
      value: stats.activities,
      icon: Calendar,
      color: "text-orange-600",
    },
  ];

  if (isLoading) {
    return (
      <div className="px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to your CRM overview</p>
        </div>
        <div className="text-center py-12">
          <div className="text-lg">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to your CRM overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statsCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Upcoming Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Activities</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingActivities.length === 0 ? (
              <p className="text-muted-foreground text-center py-6">
                No upcoming activities
              </p>
            ) : (
              <div className="space-y-4">
                {upcomingActivities.slice(0, 5).map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex-shrink-0">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {activity.subject}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activity.type} •{" "}
                        {activity.contact_name ||
                          activity.company_name ||
                          "No contact"}
                      </p>
                    </div>
                    {activity.dueDate && (
                      <div className="text-xs text-muted-foreground">
                        {new Date(activity.dueDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button
                variant="outline"
                onClick={() =>
                  navigate("/contacts", { state: { openForm: true } })
                }
                className="w-full justify-start p-3 h-auto bg-primary/10 hover:bg-primary/20 border-none"
              >
                <div className="flex items-center space-x-3">
                  <Users className="h-5 w-5 text-primary" />
                  <span className="font-medium">Add New Contact</span>
                </div>
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  navigate("/companies", { state: { openForm: true } })
                }
                className="w-full justify-start p-3 h-auto bg-green-100 hover:bg-green-200 border-none"
              >
                <div className="flex items-center space-x-3">
                  <Building2 className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Add New Company</span>
                </div>
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  navigate("/deals", { state: { openForm: true } })
                }
                className="w-full justify-start p-3 h-auto bg-purple-100 hover:bg-purple-200 border-none"
              >
                <div className="flex items-center space-x-3">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  <span className="font-medium">Create New Deal</span>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
