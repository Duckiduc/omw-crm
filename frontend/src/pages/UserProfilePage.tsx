import { useState } from "react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { ChangePasswordModal } from "../components/ui/ChangePasswordModal";
import { useAuth } from "../hooks/useAuth";
import { User, Key, Shield } from "lucide-react";

export default function UserProfilePage() {
  const { user } = useAuth();
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] =
    useState(false);

  const handlePasswordChanged = () => {
    // Could show a toast notification here
    console.log("Password changed successfully");
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading user information...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Profile</h1>
        <p className="text-gray-600">
          Manage your account settings and preferences
        </p>
      </div>

      {/* User Information Card */}
      <Card className="p-6">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">
              {user.firstName} {user.lastName}
            </h2>
            <p className="text-gray-600">{user.email}</p>
            <div className="flex items-center mt-1">
              <Shield className="w-4 h-4 text-gray-400 mr-1" />
              <span className="text-sm text-gray-500 capitalize">
                {user.role || "user"}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                First Name
              </label>
              <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded-md">
                {user.firstName}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Last Name
              </label>
              <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded-md">
                {user.lastName}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded-md">
                {user.email}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Role
              </label>
              <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded-md capitalize">
                {user.role || "user"}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Security Settings Card */}
      <Card className="p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Key className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-medium">Security Settings</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium">Password</h4>
              <p className="text-sm text-gray-600">
                Change your account password
              </p>
            </div>
            <Button
              onClick={() => setIsChangePasswordModalOpen(true)}
              variant="outline"
              size="sm"
            >
              Change Password
            </Button>
          </div>
        </div>
      </Card>

      {/* Account Activity Card */}
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Account Information</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Account created:</span>
            <span className="font-medium">Information not available</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Last login:</span>
            <span className="font-medium">Current session</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">User ID:</span>
            <span className="font-medium font-mono">{user.id}</span>
          </div>
        </div>
      </Card>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
        onPasswordChanged={handlePasswordChanged}
      />
    </div>
  );
}
