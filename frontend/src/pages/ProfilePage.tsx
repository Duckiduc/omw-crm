import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { ChangePasswordForm } from "../components/ChangePasswordForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { User, Mail, Calendar, Shield } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");

  if (!user) {
    return null;
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "Not available";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return "Not available";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Profile Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab("profile")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "profile"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300"
            }`}
          >
            Profile Information
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "security"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300"
            }`}
          >
            Security
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "profile" && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* User Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Personal Information</CardTitle>
              </div>
              <CardDescription>
                Your account details and information.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">First Name</label>
                  <Input
                    value={user.firstName || user.first_name || ""}
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Last Name</label>
                  <Input
                    value={user.lastName || user.last_name || ""}
                    readOnly
                    className="bg-muted"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center space-x-2">
                  <Mail className="h-4 w-4" />
                  <span>Email Address</span>
                </label>
                <Input value={user.email} readOnly className="bg-muted" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center space-x-2">
                  <Shield className="h-4 w-4" />
                  <span>Role</span>
                </label>
                <Input
                  value={user.role === "admin" ? "Administrator" : "User"}
                  readOnly
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>Member Since</span>
                </label>
                <Input
                  value={formatDate(user.created_at)}
                  readOnly
                  className="bg-muted"
                />
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  To update your personal information, please contact your
                  administrator.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Account Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Account Overview</CardTitle>
              <CardDescription>
                Your account activity and statistics.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium">Account Status</p>
                    <p className="text-sm text-muted-foreground">Active</p>
                  </div>
                  <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium">User ID</p>
                    <p className="text-sm text-muted-foreground font-mono">
                      {user.id}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium">Last Updated</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(user.updated_at)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "security" && (
        <div className="max-w-2xl">
          <ChangePasswordForm />
        </div>
      )}
    </div>
  );
}
