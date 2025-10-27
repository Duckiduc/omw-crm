import { useState, useEffect } from "react";
import { Button } from "./Button";
import { Select } from "./Select";
import { Textarea } from "./Textarea";
import { Card, CardHeader, CardTitle, CardContent } from "./Card";
import { apiClient } from "../../lib/api";
import type { User } from "../../lib/api";
import { X, Share2, Users, Eye, Edit3 } from "lucide-react";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceType: "contact" | "activity" | "deal";
  resourceId: number;
  resourceTitle: string;
  onSuccess?: () => void;
}

export default function ShareModal({
  isOpen,
  onClose,
  resourceType,
  resourceId,
  resourceTitle,
  onSuccess,
}: ShareModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [permission, setPermission] = useState("view");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    try {
      const response = await apiClient.getUsersForSharing();
      if (response.data) {
        setUsers(response.data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      setError("Failed to load users");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUserId) {
      setError("Please select a user to share with");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await apiClient.shareItem({
        resourceType,
        resourceId,
        sharedWithUserId: parseInt(selectedUserId),
        permission,
        message: message.trim() || undefined,
      });

      if (onSuccess) onSuccess();
      handleClose();
    } catch (error) {
      console.error("Error sharing item:", error);
      setError(
        "Failed to share item. It may already be shared with this user."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedUserId("");
    setPermission("view");
    setMessage("");
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Share2 className="mr-2 h-5 w-5" />
              Share {resourceType}
            </div>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Sharing:</p>
            <p className="font-medium">{resourceTitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                {error}
              </div>
            )}

            <div>
              <label className="text-sm font-medium flex items-center mb-2">
                <Users className="mr-1 h-4 w-4" />
                Share with user *
              </label>
              <Select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                required
              >
                <option value="">Select a user...</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id.toString()}>
                    {user.firstName} {user.lastName} ({user.email})
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Permission level
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="permission"
                    value="view"
                    checked={permission === "view"}
                    onChange={(e) => setPermission(e.target.value)}
                    className="mr-2"
                  />
                  <Eye className="mr-1 h-4 w-4" />
                  <span className="text-sm">
                    <strong>View only</strong> - Can see but not modify
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="permission"
                    value="edit"
                    checked={permission === "edit"}
                    onChange={(e) => setPermission(e.target.value)}
                    className="mr-2"
                  />
                  <Edit3 className="mr-1 h-4 w-4" />
                  <span className="text-sm">
                    <strong>Can edit</strong> - Can view and modify
                  </span>
                </label>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Message (optional)
              </label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a note about why you're sharing this..."
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Sharing..." : "Share"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
