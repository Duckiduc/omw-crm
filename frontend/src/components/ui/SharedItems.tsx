import { useState, useEffect, useCallback } from "react";
import { Button } from "./Button";
import { Card, CardHeader, CardTitle, CardContent } from "./Card";
import { Table } from "./Table";
import { Badge } from "./Badge";
import { apiClient } from "../../lib/api";
import type { Share, Contact, Activity, Deal } from "../../lib/api";
import {
  Share2,
  Eye,
  Edit3,
  Trash2,
  MessageSquare,
  Users,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";

interface SharedItemsProps {
  resourceType?: "contact" | "activity" | "deal";
  showOwned?: boolean;
  showSharedWithMe?: boolean;
}

const getResourceTitle = (
  resourceData: Contact | Activity | Deal,
  resourceType: string
): string => {
  if (resourceType === "contact") {
    const contact = resourceData as Contact;
    return `${contact.firstName} ${contact.lastName}`.trim();
  } else if (resourceType === "activity") {
    const activity = resourceData as Activity;
    return activity.type || "Activity";
  } else if (resourceType === "deal") {
    const deal = resourceData as Deal;
    return deal.title || "Deal";
  }
  return "Unknown";
};

export default function SharedItems({
  resourceType,
  showOwned = true,
  showSharedWithMe = true,
}: SharedItemsProps) {
  const [shares, setShares] = useState<Share[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchShares = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.getShares(resourceType);
      if (response.data) {
        // Transform the data to add computed properties
        const transformedShares = response.data.map(
          (share: Partial<Share>) => ({
            ...share,
            resourceType: share.resource_type,
            resourceId: share.resource_id,
            createdAt: share.created_at,
            sharedWithFirstName: share.shared_with_first_name,
            sharedWithLastName: share.shared_with_last_name,
            ownerFirstName: share.shared_by_first_name,
            ownerLastName: share.shared_by_last_name,
            isSharedWithMe: false, // This will be set by the backend based on current user
            resourceTitle: share.resource_data
              ? getResourceTitle(share.resource_data, share.resource_type!)
              : `${share.resource_type} #${share.resource_id}`,
          })
        ) as Share[];

        let filteredShares = transformedShares;

        if (!showOwned && !showSharedWithMe) {
          filteredShares = [];
        } else if (!showOwned) {
          filteredShares = transformedShares.filter(
            (share: Share) => share.isSharedWithMe
          );
        } else if (!showSharedWithMe) {
          filteredShares = transformedShares.filter(
            (share: Share) => !share.isSharedWithMe
          );
        }

        setShares(filteredShares);
      }
    } catch (error) {
      console.error("Error fetching shares:", error);
      setError("Failed to load shared items");
    } finally {
      setIsLoading(false);
    }
  }, [resourceType, showOwned, showSharedWithMe]);

  useEffect(() => {
    fetchShares();
  }, [fetchShares]);

  const handleRemoveShare = async (shareId: number) => {
    if (!confirm("Are you sure you want to remove this share?")) return;

    try {
      await apiClient.removeShare(shareId);
      await fetchShares(); // Refresh the list
    } catch (error) {
      console.error("Error removing share:", error);
      alert("Failed to remove share");
    }
  };

  const getResourceTypeDisplay = (type: string) => {
    switch (type) {
      case "contact":
        return "Contact";
      case "activity":
        return "Activity";
      case "deal":
        return "Deal";
      default:
        return type;
    }
  };

  const getPermissionIcon = (permission: string) => {
    return permission === "edit" ? (
      <Edit3 className="h-4 w-4" />
    ) : (
      <Eye className="h-4 w-4" />
    );
  };

  const getPermissionVariant = (permission: string) => {
    return permission === "edit" ? "default" : "secondary";
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading shared items...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={fetchShares} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Share2 className="mr-2 h-5 w-5" />
          Shared Items
          {resourceType && (
            <Badge variant="outline" className="ml-2">
              {getResourceTypeDisplay(resourceType)}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {shares.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No shared items found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Title</th>
                  <th>Direction</th>
                  <th>User</th>
                  <th>Permission</th>
                  <th>Shared Date</th>
                  <th>Message</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shares.map((share) => (
                  <tr key={share.id}>
                    <td>
                      <Badge variant="outline">
                        {getResourceTypeDisplay(
                          share.resourceType || share.resource_type
                        )}
                      </Badge>
                    </td>
                    <td className="font-medium">
                      {share.resourceTitle ||
                        `${share.resourceType || share.resource_type} #${
                          share.resourceId || share.resource_id
                        }`}
                    </td>
                    <td>
                      {share.isSharedWithMe ? (
                        <Badge variant="secondary">Shared with me</Badge>
                      ) : (
                        <Badge variant="default">I shared</Badge>
                      )}
                    </td>
                    <td>
                      {share.isSharedWithMe
                        ? `${share.ownerFirstName} ${share.ownerLastName}`
                        : `${share.sharedWithFirstName} ${share.sharedWithLastName}`}
                    </td>
                    <td>
                      <Badge
                        variant={getPermissionVariant(share.permission)}
                        className="flex items-center w-fit"
                      >
                        {getPermissionIcon(share.permission)}
                        <span className="ml-1">{share.permission}</span>
                      </Badge>
                    </td>
                    <td className="text-sm text-muted-foreground">
                      {format(
                        new Date(share.createdAt || share.created_at),
                        "MMM d, yyyy"
                      )}
                    </td>
                    <td>
                      {share.message ? (
                        <div className="flex items-center text-sm">
                          <MessageSquare className="h-3 w-3 mr-1" />
                          <span
                            className="truncate max-w-xs"
                            title={share.message}
                          >
                            {share.message}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            // Navigate to the resource (this would be implemented based on your routing)
                            const resourceType =
                              share.resourceType || share.resource_type;
                            const resourceId =
                              share.resourceId || share.resource_id;
                            const baseUrl =
                              resourceType === "contact"
                                ? "/contacts"
                                : resourceType === "activity"
                                ? "/activities"
                                : "/deals";
                            window.location.href = `${baseUrl}/${resourceId}`;
                          }}
                          title="View item"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        {!share.isSharedWithMe && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveShare(share.id)}
                            className="text-destructive hover:text-destructive"
                            title="Remove share"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
