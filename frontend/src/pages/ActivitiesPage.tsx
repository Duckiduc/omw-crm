import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { Select } from "../components/ui/Select";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Calendar as CalendarComponent } from "../components/ui/Calendar";
import ShareModal from "../components/ui/ShareModal";
import { apiClient } from "../lib/api";
import type { ActivityWithDetails, Company, Contact, Deal } from "../lib/api";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Calendar,
  CheckCircle,
  Clock,
  Phone,
  Mail,
  Users,
  FileText,
  ListTodo,
  X,
  Share2,
  Eye,
} from "lucide-react";

interface ActivityFormData {
  type: string;
  subject: string;
  description: string;
  dueDate: string;
  contactId: string;
  companyId: string;
  dealId: string;
}

type ActivityType = "call" | "email" | "meeting" | "note" | "task";
type FilterType = "all" | "pending" | "completed" | "overdue";

export default function ActivitiesPage() {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<ActivityWithDetails[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [filterActivityType, setFilterActivityType] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingActivity, setEditingActivity] =
    useState<ActivityWithDetails | null>(null);
  const [formData, setFormData] = useState<ActivityFormData>({
    type: "",
    subject: "",
    description: "",
    dueDate: "",
    contactId: "",
    companyId: "",
    dealId: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showCalendar, setShowCalendar] = useState(false);
  const [shareModal, setShareModal] = useState<{
    isOpen: boolean;
    resourceType: "contact" | "activity" | "deal" | "";
    resourceId: number | null;
    resourceTitle: string;
  }>({
    isOpen: false,
    resourceType: "",
    resourceId: null,
    resourceTitle: "",
  });
  const calendarRef = useRef<HTMLDivElement>(null);

  // Handle click outside calendar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node)
      ) {
        setShowCalendar(false);
      }
    };

    if (showCalendar) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showCalendar]);

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        // Fetch companies, contacts, and deals for dropdowns
        const [companiesRes, contactsRes, dealsRes] = await Promise.all([
          apiClient.getOrganizations({ limit: 100 }),
          apiClient.getContacts({ limit: 100 }),
          apiClient.getDeals({ limit: 100 }),
        ]);

        if (companiesRes.data) setCompanies(companiesRes.data.organizations);
        if (contactsRes.data) setContacts(contactsRes.data.contacts);
        if (dealsRes.data) setDeals(dealsRes.data.deals);
      } catch (error) {
        console.error("Error fetching initial data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  const fetchActivities = useCallback(async () => {
    try {
      const params: Record<string, string | number | boolean | undefined> = {
        page: currentPage,
        limit: 20,
        search: searchTerm || undefined,
        type: filterActivityType || undefined,
      };

      // Add completed filter based on filterType
      if (filterType === "completed") {
        params.completed = true;
      } else if (filterType === "pending") {
        params.completed = false;
      }

      const response = await apiClient.getActivities(params);

      if (response.data) {
        let activitiesList = response.data.activities;

        // Handle overdue filter on frontend since backend doesn't support it
        if (filterType === "overdue") {
          const now = new Date();
          activitiesList = activitiesList.filter(
            (activity) =>
              !activity.completed &&
              activity.dueDate &&
              new Date(activity.dueDate) < now
          );
        }

        setActivities(activitiesList);
        setTotalPages(response.data.pagination.totalPages);
      }
    } catch (error) {
      console.error("Error fetching activities:", error);
    }
  }, [currentPage, searchTerm, filterType, filterActivityType]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.type) {
      errors.type = "Activity type is required";
    }
    if (!formData.subject.trim()) {
      errors.subject = "Subject is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const activityData = {
        type: formData.type as ActivityType,
        subject: formData.subject,
        description: formData.description || undefined,
        dueDate: formData.dueDate
          ? formData.dueDate + "T12:00:00.000Z"
          : undefined,
        contactId: formData.contactId
          ? parseInt(formData.contactId)
          : undefined,
        companyId: formData.companyId
          ? parseInt(formData.companyId)
          : undefined,
        dealId: formData.dealId ? parseInt(formData.dealId) : undefined,
        completed: false,
      };

      if (editingActivity) {
        await apiClient.updateActivity(editingActivity.id, activityData);
        // Close the modal and refresh the activities list
        resetForm();
        fetchActivities();
      } else {
        await apiClient.createActivity(activityData);
        resetForm();
        fetchActivities();
      }
    } catch (error) {
      console.error("Error saving activity:", error);
    }
  };

  const handleEdit = (activity: ActivityWithDetails) => {
    setEditingActivity(activity);

    const activityData = activity as ActivityWithDetails & {
      due_date?: string;
      contact_id?: number;
      company_id?: number;
      deal_id?: number;
    };

    // Better date handling - extract just the date part
    let dueDateString = "";
    const backendDueDate = activityData.due_date || activity.dueDate;

    if (backendDueDate) {
      try {
        const date = new Date(backendDueDate);
        // Format as YYYY-MM-DD
        dueDateString = date.toISOString().split("T")[0];
      } catch (error) {
        console.error("Error parsing date:", backendDueDate, error);
        dueDateString = "";
      }
    }

    const newFormData = {
      type: activity.type,
      subject: activity.subject,
      description: activity.description || "",
      dueDate: dueDateString,
      contactId:
        (activityData.contact_id || activity.contactId)?.toString() || "",
      companyId:
        (activityData.company_id || activity.companyId)?.toString() || "",
      dealId: (activityData.deal_id || activity.dealId)?.toString() || "",
    };

    setFormData(newFormData);
    setShowForm(true);
  };

  const handleToggleComplete = async (activityId: number) => {
    try {
      await apiClient.toggleActivityComplete(activityId);
      fetchActivities();
    } catch (error) {
      console.error("Error toggling activity:", error);
    }
  };

  const handleDelete = async (activityId: number) => {
    if (!confirm("Are you sure you want to delete this activity?")) return;

    try {
      await apiClient.deleteActivity(activityId);
      fetchActivities();
    } catch (error) {
      console.error("Error deleting activity:", error);
    }
  };

  const handleViewDetails = (activityId: number) => {
    navigate(`/activities/${activityId}`);
  };

  const resetForm = () => {
    setFormData({
      type: "",
      subject: "",
      description: "",
      dueDate: "",
      contactId: "",
      companyId: "",
      dealId: "",
    });
    setFormErrors({});
    setEditingActivity(null);
    setShowForm(false);
  };

  const handleInputChange = (field: keyof ActivityFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "call":
        return <Phone className="h-4 w-4" />;
      case "email":
        return <Mail className="h-4 w-4" />;
      case "meeting":
        return <Users className="h-4 w-4" />;
      case "note":
        return <FileText className="h-4 w-4" />;
      case "task":
        return <ListTodo className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const getActivityTypeColor = (type: string) => {
    switch (type) {
      case "call":
        return "bg-blue-100 text-blue-800";
      case "email":
        return "bg-green-100 text-green-800";
      case "meeting":
        return "bg-purple-100 text-purple-800";
      case "note":
        return "bg-gray-100 text-gray-800";
      case "task":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const isOverdue = (activity: ActivityWithDetails) => {
    if (!activity.dueDate || activity.completed) return false;
    return new Date(activity.dueDate) < new Date();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="px-6">
        <div className="text-center py-12">
          <div className="text-lg">Loading activities...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Activities</h1>
          <p className="text-muted-foreground">
            Track your tasks and activities
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Activity
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="mb-6">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-64 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search activities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as FilterType)}
          >
            <option value="all">All Activities</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
          </Select>
          <Select
            value={filterActivityType}
            onChange={(e) => setFilterActivityType(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="call">Calls</option>
            <option value="email">Emails</option>
            <option value="meeting">Meetings</option>
            <option value="note">Notes</option>
            <option value="task">Tasks</option>
          </Select>
          <Button type="submit">Search</Button>
          {(searchTerm || filterType !== "all" || filterActivityType) && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                setFilterType("all");
                setFilterActivityType("");
                setCurrentPage(1);
              }}
            >
              Clear
            </Button>
          )}
        </form>
      </div>

      {/* Activity Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {editingActivity ? "Edit Activity" : "Add New Activity"}
                <Button variant="ghost" size="sm" onClick={resetForm}>
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">
                      Activity Type *
                    </label>
                    <Select
                      value={formData.type}
                      onChange={(e) =>
                        handleInputChange("type", e.target.value)
                      }
                      className={formErrors.type ? "border-destructive" : ""}
                    >
                      <option value="">Select Type</option>
                      <option value="call">Call</option>
                      <option value="email">Email</option>
                      <option value="meeting">Meeting</option>
                      <option value="note">Note</option>
                      <option value="task">Task</option>
                    </Select>
                    {formErrors.type && (
                      <p className="text-sm text-destructive mt-1">
                        {formErrors.type}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium">Due Date</label>
                    <div className="relative">
                      <Input
                        type="text"
                        value={(() => {
                          if (formData.dueDate) {
                            try {
                              const displayDate = new Date(
                                formData.dueDate + "T00:00:00"
                              ).toLocaleDateString();
                              return displayDate;
                            } catch (error) {
                              console.error(
                                "Error formatting date for display:",
                                error
                              );
                              return formData.dueDate;
                            }
                          }
                          return "";
                        })()}
                        onClick={() => setShowCalendar(!showCalendar)}
                        readOnly
                        placeholder="Select due date"
                        className="cursor-pointer"
                      />
                      <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      {showCalendar && (
                        <div
                          ref={calendarRef}
                          className="absolute z-50 mt-1 bg-background border border-border rounded-lg shadow-lg"
                        >
                          <CalendarComponent
                            mode="single"
                            selected={
                              formData.dueDate
                                ? new Date(formData.dueDate + "T00:00:00")
                                : undefined
                            }
                            onSelect={(date) => {
                              if (date) {
                                // Format date as YYYY-MM-DD in local timezone
                                const year = date.getFullYear();
                                const month = String(
                                  date.getMonth() + 1
                                ).padStart(2, "0");
                                const day = String(date.getDate()).padStart(
                                  2,
                                  "0"
                                );
                                const localDateString = `${year}-${month}-${day}`;
                                handleInputChange("dueDate", localDateString);
                              } else {
                                handleInputChange("dueDate", "");
                              }
                              setShowCalendar(false);
                            }}
                            className="rounded-lg border-0"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Subject *</label>
                  <Input
                    value={formData.subject}
                    onChange={(e) =>
                      handleInputChange("subject", e.target.value)
                    }
                    className={formErrors.subject ? "border-destructive" : ""}
                  />
                  {formErrors.subject && (
                    <p className="text-sm text-destructive mt-1">
                      {formErrors.subject}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) =>
                      handleInputChange("description", e.target.value)
                    }
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Contact</label>
                    <Select
                      value={formData.contactId}
                      onChange={(e) =>
                        handleInputChange("contactId", e.target.value)
                      }
                    >
                      <option value="">Select Contact</option>
                      {contacts.map((contact) => (
                        <option key={contact.id} value={contact.id.toString()}>
                          {contact.firstName} {contact.lastName}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Company</label>
                    <Select
                      value={formData.companyId}
                      onChange={(e) =>
                        handleInputChange("companyId", e.target.value)
                      }
                    >
                      <option value="">Select Company</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id.toString()}>
                          {company.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Deal</label>
                    <Select
                      value={formData.dealId}
                      onChange={(e) =>
                        handleInputChange("dealId", e.target.value)
                      }
                    >
                      <option value="">Select Deal</option>
                      {deals.map((deal) => (
                        <option key={deal.id} value={deal.id.toString()}>
                          {deal.title}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingActivity ? "Update Activity" : "Create Activity"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Activities List */}
      <div className="space-y-4">
        {activities.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No activities found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || filterType !== "all" || filterActivityType
                  ? "No activities match your search."
                  : "Get started by adding your first activity."}
              </p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Activity
              </Button>
            </CardContent>
          </Card>
        ) : (
          activities.map((activity) => (
            <Card
              key={activity.id}
              className={`${
                isOverdue(activity) ? "border-red-200 bg-red-50" : ""
              }`}
            >
              <CardContent className="">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div
                        className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${getActivityTypeColor(
                          activity.type
                        )}`}
                      >
                        {getActivityIcon(activity.type)}
                        <span className="capitalize">{activity.type}</span>
                      </div>
                      <h3 className="text-lg font-semibold">
                        {activity.subject}
                      </h3>
                      {activity.completed && (
                        <Badge
                          variant="default"
                          className="bg-green-100 text-green-800"
                        >
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Completed
                        </Badge>
                      )}
                      {isOverdue(activity) && (
                        <Badge variant="destructive">
                          <Clock className="mr-1 h-3 w-3" />
                          Overdue
                        </Badge>
                      )}
                    </div>

                    {activity.description && (
                      <p className="text-sm text-muted-foreground mb-3">
                        {activity.description}
                      </p>
                    )}

                    <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                      {activity.dueDate && (
                        <div className="flex items-center">
                          <Calendar className="mr-1 h-4 w-4" />
                          <span>Due: {formatDate(activity.dueDate)}</span>
                        </div>
                      )}

                      {activity.contact_name && (
                        <div className="flex items-center">
                          <Users className="mr-1 h-4 w-4" />
                          <span>{activity.contact_name}</span>
                        </div>
                      )}

                      {activity.company_name && (
                        <div className="flex items-center">
                          <span>{activity.company_name}</span>
                        </div>
                      )}

                      {activity.deal_title && (
                        <div className="flex items-center">
                          <span>Deal: {activity.deal_title}</span>
                        </div>
                      )}

                      <div className="flex items-center">
                        <span>
                          Created: {formatDateTime(activity.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleComplete(activity.id)}
                      className={activity.completed ? "text-green-600" : ""}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(activity.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(activity)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShareModal({
                          isOpen: true,
                          resourceType: "activity",
                          resourceId: activity.id,
                          resourceTitle: activity.subject,
                        });
                      }}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(activity.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

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

      {shareModal.isOpen &&
        shareModal.resourceType !== "" &&
        shareModal.resourceId !== null && (
          <ShareModal
            isOpen={shareModal.isOpen}
            onClose={() =>
              setShareModal({
                isOpen: false,
                resourceType: "",
                resourceId: null,
                resourceTitle: "",
              })
            }
            resourceType={
              shareModal.resourceType as "contact" | "activity" | "deal"
            }
            resourceId={shareModal.resourceId}
            resourceTitle={shareModal.resourceTitle}
          />
        )}
    </div>
  );
}
