import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/Card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "../components/ui/Table";
import { Badge } from "../components/ui/Badge";
import { apiClient } from "../lib/api";
import type { Organization } from "../lib/api";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Building2,
  Globe,
  Mail,
  Phone,
  MapPin,
  Users,
} from "lucide-react";

interface OrganizationFormData {
  name: string;
  industry: string;
  website: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}

export default function OrganizationsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingOrganization, setEditingOrganization] =
    useState<Organization | null>(null);

  // Check if we should automatically open the form (from Dashboard navigation)
  useEffect(() => {
    if (location.state?.openForm) {
      setShowForm(true);
      // Clear the state to prevent reopening on future navigations
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);
  const [formData, setFormData] = useState<OrganizationFormData>({
    name: "",
    industry: "",
    website: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await apiClient.getOrganizations({
          page: currentPage,
          limit: 20,
          search: searchTerm || undefined,
        });

        if (response.data) {
          setOrganizations(response.data.organizations);
          setTotalPages(response.data.pagination.totalPages);
        }
      } catch (error) {
        console.error("Error fetching organizations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentPage, searchTerm]);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getOrganizations({
        page: currentPage,
        limit: 20,
        ...(searchTerm && { search: searchTerm }),
      });

      if (response.data) {
        setOrganizations(response.data.organizations);
        setTotalPages(response.data.pagination.totalPages);
      }
    } catch (error) {
      console.error("Error fetching organizations:", error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "Organization name is required";
    }
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Invalid email format";
    }
    if (formData.website && !formData.website.startsWith("http")) {
      errors.website = "Website must start with http:// or https://";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const organizationData = {
        name: formData.name,
        industry: formData.industry || undefined,
        website: formData.website || undefined,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        address: formData.address || undefined,
        notes: formData.notes || undefined,
      };

      if (editingOrganization) {
        await apiClient.updateOrganization(
          editingOrganization.id,
          organizationData
        );
      } else {
        await apiClient.createOrganization(organizationData);
      }

      resetForm();
      fetchOrganizations();
    } catch (error) {
      console.error("Error saving company:", error);
    }
  };

  const handleEdit = (organization: Organization) => {
    setEditingOrganization(organization);
    setFormData({
      name: organization.name,
      industry: organization.industry || "",
      website: organization.website || "",
      phone: organization.phone || "",
      email: organization.email || "",
      address: organization.address || "",
      notes: organization.notes || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (organizationId: number) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this organization? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await apiClient.deleteOrganization(organizationId);
      fetchOrganizations();
    } catch (error) {
      console.error("Error deleting company:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      industry: "",
      website: "",
      phone: "",
      email: "",
      address: "",
      notes: "",
    });
    setFormErrors({});
    setEditingOrganization(null);
    setShowForm(false);
  };

  const handleInputChange = (
    field: keyof OrganizationFormData,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchOrganizations();
  };

  return (
    <div className="px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Organizations</h1>
          <p className="text-muted-foreground">
            Manage your organization relationships
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Organization
        </Button>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search organizations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit">Search</Button>
            {searchTerm && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setCurrentPage(1);
                }}
              >
                Clear
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Company Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>
                {editingOrganization
                  ? "Edit Organization"
                  : "Add New Organization"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">
                    Organization Name *
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    className={formErrors.name ? "border-destructive" : ""}
                  />
                  {formErrors.name && (
                    <p className="text-sm text-destructive mt-1">
                      {formErrors.name}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Industry</label>
                    <Input
                      value={formData.industry}
                      onChange={(e) =>
                        handleInputChange("industry", e.target.value)
                      }
                      placeholder="e.g., Technology, Healthcare"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Website</label>
                    <Input
                      value={formData.website}
                      onChange={(e) =>
                        handleInputChange("website", e.target.value)
                      }
                      placeholder="https://example.com"
                      className={formErrors.website ? "border-destructive" : ""}
                    />
                    {formErrors.website && (
                      <p className="text-sm text-destructive mt-1">
                        {formErrors.website}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        handleInputChange("email", e.target.value)
                      }
                      className={formErrors.email ? "border-destructive" : ""}
                    />
                    {formErrors.email && (
                      <p className="text-sm text-destructive mt-1">
                        {formErrors.email}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    <Input
                      value={formData.phone}
                      onChange={(e) =>
                        handleInputChange("phone", e.target.value)
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Address</label>
                  <Input
                    value={formData.address}
                    onChange={(e) =>
                      handleInputChange("address", e.target.value)
                    }
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Notes</label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingOrganization
                      ? "Update Organization"
                      : "Create Organization"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Companies Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12">
              <div className="text-lg">Loading organizations...</div>
            </div>
          ) : organizations.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                No organizations found
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm
                  ? "No organizations match your search."
                  : "Get started by adding your first organization."}
              </p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Company
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Contacts</TableHead>
                  <TableHead>Contact Info</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizations.map((organization) => (
                  <TableRow key={organization.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium flex items-center">
                          <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                          {organization.name}
                        </div>
                        {organization.website && (
                          <div className="flex items-center mt-1">
                            <Globe className="mr-2 h-3 w-3 text-muted-foreground" />
                            <a
                              href={organization.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline"
                            >
                              {organization.website}
                            </a>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {organization.industry ? (
                        <Badge variant="secondary">
                          {organization.industry}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {organization.contactCount || 0}
                        </span>
                        <span className="text-muted-foreground ml-1">
                          contacts
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {organization.email && (
                          <div className="flex items-center text-sm">
                            <Mail className="mr-2 h-3 w-3 text-muted-foreground" />
                            <a
                              href={`mailto:${organization.email}`}
                              className="text-primary hover:underline"
                            >
                              {organization.email}
                            </a>
                          </div>
                        )}
                        {organization.phone && (
                          <div className="flex items-center text-sm">
                            <Phone className="mr-2 h-3 w-3 text-muted-foreground" />
                            <a
                              href={`tel:${organization.phone}`}
                              className="text-primary hover:underline"
                            >
                              {organization.phone}
                            </a>
                          </div>
                        )}
                        {organization.address && (
                          <div className="flex items-center text-sm">
                            <MapPin className="mr-2 h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              {organization.address}
                            </span>
                          </div>
                        )}
                        {!organization.email &&
                          !organization.phone &&
                          !organization.address && (
                            <span className="text-muted-foreground text-sm">
                              No contact info
                            </span>
                          )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(organization)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(organization.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
