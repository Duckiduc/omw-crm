import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { Select } from "../components/ui/Select";
import { TagInput } from "../components/ui/TagInput";
import {
  ContactStatusBadge,
  ContactStatusSelect,
} from "../components/ui/ContactStatus";
import { Badge } from "../components/ui/Badge";
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
import ShareModal from "../components/ui/ShareModal";
import { apiClient } from "../lib/api";
import type { Contact, Company } from "../lib/api";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Building2,
  Mail,
  Phone,
  User,
  Share2,
} from "lucide-react";

interface ContactFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  position: string;
  companyId: string;
  notes: string;
  tags: string[];
  status: "hot" | "warm" | "cold" | "allGood";
}

export default function ContactsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<
    "hot" | "warm" | "cold" | "allGood" | ""
  >("");
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  // Check if we should automatically open the form (from Dashboard navigation)
  useEffect(() => {
    if (location.state?.openForm) {
      setShowForm(true);
      // Clear the state to prevent reopening on future navigations
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);
  const [formData, setFormData] = useState<ContactFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    position: "",
    companyId: "",
    notes: "",
    tags: [],
    status: "allGood",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [shareModal, setShareModal] = useState<{
    isOpen: boolean;
    contactId: number | null;
    contactName: string;
  }>({
    isOpen: false,
    contactId: null,
    contactName: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await apiClient.getContacts({
          page: 1,
          limit: 20,
          search: searchTerm || undefined,
          tags: selectedTags.length > 0 ? selectedTags.join(",") : undefined,
          status: selectedStatus || undefined,
        });
        if (response.data) {
          setContacts(response.data.contacts);
          setTotalPages(response.data.pagination.totalPages);
        }
      } catch (error) {
        console.error("Error fetching contacts:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentPage, searchTerm, selectedTags, selectedStatus]);

  useEffect(() => {
    fetchCompanies();
    fetchTags();
  }, []);

  const fetchContacts = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.getContacts({
        page: currentPage,
        limit: 20,
        search: searchTerm || undefined,
        tags: selectedTags.length > 0 ? selectedTags.join(",") : undefined,
      });

      if (response.data) {
        setContacts(response.data.contacts);
        setTotalPages(response.data.pagination.totalPages);
      }
    } catch (error) {
      console.error("Error fetching contacts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await apiClient.getContactTags();
      if (response.data) {
        setAvailableTags(response.data.tags);
      }
    } catch (error) {
      console.error("Error fetching tags:", error);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await apiClient.getOrganizations({ limit: 100 });
      if (response.data) {
        setCompanies(response.data.organizations);
      }
    } catch (error) {
      console.error("Error fetching organizations:", error);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      errors.firstName = "First name is required";
    }
    if (!formData.lastName.trim()) {
      errors.lastName = "Last name is required";
    }
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Invalid email format";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const contactData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        position: formData.position || undefined,
        companyId: formData.companyId
          ? parseInt(formData.companyId)
          : undefined,
        notes: formData.notes || undefined,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
        status: formData.status,
      };

      if (editingContact) {
        await apiClient.updateContact(editingContact.id, contactData);
      } else {
        await apiClient.createContact(contactData);
      }

      resetForm();
      fetchContacts();
      fetchTags(); // Refresh tags list in case new ones were added
    } catch (error) {
      console.error("Error saving contact:", error);
    }
  };

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email || "",
      phone: contact.phone || "",
      position: contact.position || "",
      companyId: contact.companyId?.toString() || "",
      notes: contact.notes || "",
      tags: contact.tags || [],
      status: contact.status || "allGood",
    });
    setShowForm(true);
  };

  const handleDelete = async (contactId: number) => {
    if (!confirm("Are you sure you want to delete this contact?")) return;

    try {
      await apiClient.deleteContact(contactId);
      fetchContacts();
    } catch (error) {
      console.error("Error deleting contact:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      position: "",
      companyId: "",
      notes: "",
      tags: [],
      status: "allGood",
    });
    setFormErrors({});
    setEditingContact(null);
    setShowForm(false);
  };

  const handleInputChange = (field: keyof ContactFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchContacts();
  };

  return (
    <div className="px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Contacts</h1>
          <p className="text-muted-foreground">
            Manage your contacts and relationships
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Contact
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="p-4 space-y-4">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
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

          {/* Tag Filter */}
          {availableTags.length > 0 && (
            <div>
              <label className="text-sm font-medium mb-2 block">
                Filter by tags:
              </label>
              <TagInput
                tags={selectedTags}
                onChange={(tags) => {
                  setSelectedTags(tags);
                  setCurrentPage(1);
                }}
                suggestions={availableTags}
                placeholder="Filter by tags..."
              />
              {selectedTags.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    setSelectedTags([]);
                    setCurrentPage(1);
                  }}
                >
                  Clear Tags Filter
                </Button>
              )}
            </div>
          )}

          {/* Status Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Filter by status:
            </label>
            <div className="flex gap-2 items-center">
              <Select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(
                    e.target.value as "hot" | "warm" | "cold" | "allGood" | ""
                  );
                  setCurrentPage(1);
                }}
              >
                <option value="">All statuses</option>
                <option value="hot">Hot</option>
                <option value="warm">Warm</option>
                <option value="cold">Cold</option>
                <option value="allGood">All Good</option>
              </Select>
              {selectedStatus && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedStatus("");
                    setCurrentPage(1);
                  }}
                >
                  Clear Status Filter
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>
                {editingContact ? "Edit Contact" : "Add New Contact"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">First Name *</label>
                    <Input
                      value={formData.firstName}
                      onChange={(e) =>
                        handleInputChange("firstName", e.target.value)
                      }
                      className={
                        formErrors.firstName ? "border-destructive" : ""
                      }
                    />
                    {formErrors.firstName && (
                      <p className="text-sm text-destructive mt-1">
                        {formErrors.firstName}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium">Last Name *</label>
                    <Input
                      value={formData.lastName}
                      onChange={(e) =>
                        handleInputChange("lastName", e.target.value)
                      }
                      className={
                        formErrors.lastName ? "border-destructive" : ""
                      }
                    />
                    {formErrors.lastName && (
                      <p className="text-sm text-destructive mt-1">
                        {formErrors.lastName}
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Position</label>
                    <Input
                      value={formData.position}
                      onChange={(e) =>
                        handleInputChange("position", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Company</label>
                    <Select
                      value={formData.companyId}
                      onChange={(e) =>
                        handleInputChange("companyId", e.target.value)
                      }
                    >
                      <option value="">Select a company</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Notes</label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                    rows={3}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Tags</label>
                  <TagInput
                    tags={formData.tags}
                    onChange={(tags) =>
                      setFormData((prev) => ({ ...prev, tags }))
                    }
                    suggestions={availableTags}
                    placeholder="Add tags to categorize contact..."
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Status</label>
                  <ContactStatusSelect
                    value={formData.status}
                    onChange={(status) =>
                      setFormData((prev) => ({ ...prev, status }))
                    }
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingContact ? "Update Contact" : "Create Contact"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Contacts Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="text-lg">Loading contacts...</div>
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-12">
              <User className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No contacts found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm
                  ? "No contacts match your search."
                  : "Get started by adding your first contact."}
              </p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Contact
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell>
                      <div className="font-medium">
                        <button
                          onClick={() => navigate(`/contacts/${contact.id}`)}
                          className="text-primary hover:underline text-left"
                        >
                          {contact.firstName} {contact.lastName}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell>
                      {contact.companyName ? (
                        <div className="flex items-center">
                          <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                          {contact.companyName}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {contact.position || (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <ContactStatusBadge
                        status={contact.status || "allGood"}
                      />
                    </TableCell>
                    <TableCell>
                      {contact.tags && contact.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {contact.tags.slice(0, 3).map((tag, index) => (
                            <Badge key={index} variant="secondary">
                              {tag}
                            </Badge>
                          ))}
                          {contact.tags.length > 3 && (
                            <span className="text-xs text-muted-foreground">
                              +{contact.tags.length - 3} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {contact.email ? (
                        <div className="flex items-center">
                          <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                          <a
                            href={`mailto:${contact.email}`}
                            className="text-primary hover:underline"
                          >
                            {contact.email}
                          </a>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {contact.phone ? (
                        <div className="flex items-center">
                          <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
                          <a
                            href={`tel:${contact.phone}`}
                            className="text-primary hover:underline"
                          >
                            {contact.phone}
                          </a>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShareModal({
                              isOpen: true,
                              contactId: contact.id,
                              contactName: `${contact.firstName} ${contact.lastName}`,
                            });
                          }}
                          title="Share contact"
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(contact)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(contact.id)}
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

      {/* Share Modal */}
      <ShareModal
        isOpen={shareModal.isOpen}
        onClose={() =>
          setShareModal({
            isOpen: false,
            contactId: null,
            contactName: "",
          })
        }
        resourceType="contact"
        resourceId={shareModal.contactId!}
        resourceTitle={shareModal.contactName}
        onSuccess={() => {
          // Optional: Show a success message or refresh data
          console.log("Contact shared successfully");
        }}
      />
    </div>
  );
}
