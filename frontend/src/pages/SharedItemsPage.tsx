import { useState, useEffect } from "react";
import SharedItems from "../components/ui/SharedItems";
import { Button } from "../components/ui/Button";
import { Select } from "../components/ui/Select";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/Card";
import { apiClient } from "../lib/api";
import { Share2, Filter, Users, Eye } from "lucide-react";

export default function SharedItemsPage() {
  const [resourceTypeFilter, setResourceTypeFilter] = useState<
    "contact" | "activity" | "deal" | ""
  >("");
  const [viewFilter, setViewFilter] = useState<
    "all" | "shared-by-me" | "shared-with-me"
  >("all");
  const [statistics, setStatistics] = useState({
    sharedByMe: 0,
    sharedWithMe: 0,
    total: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setIsLoadingStats(true);

        // Fetch counts for shared by me and shared with me
        const [sharedByMeRes, sharedWithMeRes] = await Promise.all([
          apiClient.getSharedByMe({ limit: 1 }), // Just get pagination info
          apiClient.getSharedWithMe({ limit: 1 }), // Just get pagination info
        ]);

        const sharedByMeTotal = sharedByMeRes.data?.pagination?.total || 0;
        const sharedWithMeTotal = sharedWithMeRes.data?.pagination?.total || 0;

        setStatistics({
          sharedByMe: sharedByMeTotal,
          sharedWithMe: sharedWithMeTotal,
          total: sharedByMeTotal + sharedWithMeTotal,
        });
      } catch (error) {
        console.error("Error fetching share statistics:", error);
        setStatistics({
          sharedByMe: 0,
          sharedWithMe: 0,
          total: 0,
        });
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchStatistics();
  }, []);

  const getShowOwned = () => {
    return viewFilter === "all" || viewFilter === "shared-by-me";
  };

  const getShowSharedWithMe = () => {
    return viewFilter === "all" || viewFilter === "shared-with-me";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <Share2 className="mr-3 h-8 w-8" />
            Shared Items
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage contacts, activities, and deals shared with you or by you
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Items I've Shared
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingStats ? "..." : statistics.sharedByMe}
            </div>
            <p className="text-xs text-muted-foreground">
              Items you've shared with others
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Items Shared With Me
            </CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingStats ? "..." : statistics.sharedWithMe}
            </div>
            <p className="text-xs text-muted-foreground">
              Items others have shared with you
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Shared Items
            </CardTitle>
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingStats ? "..." : statistics.total}
            </div>
            <p className="text-xs text-muted-foreground">
              All items involved in sharing
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Resource Type</label>
              <Select
                value={resourceTypeFilter}
                onChange={(e) =>
                  setResourceTypeFilter(
                    e.target.value as "contact" | "activity" | "deal" | ""
                  )
                }
              >
                <option value="">All Types</option>
                <option value="contact">Contacts</option>
                <option value="activity">Activities</option>
                <option value="deal">Deals</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">View</label>
              <Select
                value={viewFilter}
                onChange={(e) =>
                  setViewFilter(
                    e.target.value as "all" | "shared-by-me" | "shared-with-me"
                  )
                }
              >
                <option value="all">All Shares</option>
                <option value="shared-by-me">Items I Shared</option>
                <option value="shared-with-me">Items Shared With Me</option>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setResourceTypeFilter("");
                  setViewFilter("all");
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shared Items List */}
      <SharedItems
        resourceType={resourceTypeFilter || undefined}
        showOwned={getShowOwned()}
        showSharedWithMe={getShowSharedWithMe()}
      />
    </div>
  );
}
