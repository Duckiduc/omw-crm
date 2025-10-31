import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { Select } from "../components/ui/Select";
import { Badge } from "../components/ui/Badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/Card";
import { apiClient } from "../lib/api";
import type {
  ActivityWithDetails,
  Organization,
  Contact,
  Deal,
  ActivityNote,
} from "../lib/api";
import {
  ArrowLeft,
  Edit,
  Plus,
  Trash2,
  Save,
  X,
  Calendar,
  CheckCircle,
  Clock,
  Phone,
  Mail,
  Users,
  FileText,
  ListTodo,
  MessageCircle,
} from "lucide-react";

type ActivityType = "call" | "email" | "meeting" | "note" | "task";

interface ActivityFormData {
  type: string;
  subject: string;
  description: string;
  dueDate: string;
  contactId: string;
  companyId: string;
  dealId: string;
  completed: boolean;
}

export default function ActivityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activity, setActivity] = useState<ActivityWithDetails | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [notes, setNotes] = useState<ActivityNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [editingNoteContent, setEditingNoteContent] = useState("");
  const [formData, setFormData] = useState<ActivityFormData>({
    type: "",
    subject: "",
    description: "",
    dueDate: "",
    contactId: "",
    companyId: "",
    dealId: "",
    completed: false,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchData = async () => {
      if (!id) {
        navigate("/activities");
        return;
      }

      try {
        setIsLoading(true);
        const [activityRes, organizationsRes, contactsRes, dealsRes] =
          await Promise.all([
            apiClient.getActivity(parseInt(id)),
            apiClient.getOrganizations({ limit: 100 }),
            apiClient.getContacts({ limit: 100 }),
            apiClient.getDeals({ limit: 100 }),
          ]);

        if (activityRes.data) {
          const activityData = activityRes.data;
          setActivity(activityData);

          const actData = activityData as ActivityWithDetails & {
            due_date?: string;
            contact_id?: number;
            company_id?: number;
            deal_id?: number;
          };

          // Better date handling
          let dueDateString = "";
          const backendDueDate = actData.due_date || activityData.dueDate;

          if (backendDueDate) {
            try {
              const date = new Date(backendDueDate);
              dueDateString = date.toISOString().split("T")[0];
            } catch (error) {
              console.error("Error parsing date:", backendDueDate, error);
              dueDateString = "";
            }
          }

          setFormData({
            type: activityData.type,
            subject: activityData.subject,
            description: activityData.description || "",
            dueDate: dueDateString,
            contactId:
              (actData.contact_id || activityData.contactId)?.toString() || "",
            companyId:
              (actData.company_id || activityData.companyId)?.toString() || "",
            dealId: (actData.deal_id || activityData.dealId)?.toString() || "",
            completed: activityData.completed || false,
          });

          // Fetch notes for this activity
          const notesRes = await apiClient.getActivityNotes(parseInt(id));
          if (notesRes.data) {
            setNotes(notesRes.data.notes);
          }
        } else {
          navigate("/activities");
          return;
        }

        if (organizationsRes.data)
          setOrganizations(organizationsRes.data.organizations);
        if (contactsRes.data) setContacts(contactsRes.data.contacts);
        if (dealsRes.data) setDeals(dealsRes.data.deals);
      } catch (error) {
        console.error("Error fetching activity:", error);
        navigate("/activities");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, navigate]);

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

  const handleSave = async () => {
    if (!validateForm() || !activity) return;

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
        completed: formData.completed,
      };

      const response = await apiClient.updateActivity(
        activity.id,
        activityData
      );
      if (response.data) {
        setActivity(response.data);
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Error updating activity:", error);
    }
  };

  const handleInputChange = (
    field: keyof ActivityFormData,
    value: string | boolean
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleAddNote = async () => {
    if (!newNoteContent.trim() || !activity) return;

    try {
      const response = await apiClient.createActivityNote({
        activityId: activity.id,
        content: newNoteContent,
      });

      if (response.data) {
        setNotes((prev) => [response.data!, ...prev]);
        setNewNoteContent("");
        setShowAddNote(false);
      }
    } catch (error) {
      console.error("Error creating note:", error);
    }
  };

  const handleEditNote = async (noteId: number) => {
    if (!editingNoteContent.trim()) return;

    try {
      const response = await apiClient.updateActivityNote(
        noteId,
        editingNoteContent
      );

      if (response.data) {
        setNotes((prev) =>
          prev.map((note) => (note.id === noteId ? response.data! : note))
        );
        setEditingNoteId(null);
        setEditingNoteContent("");
      }
    } catch (error) {
      console.error("Error updating note:", error);
    }
  };

  const handleDeleteNote = async (noteId: number) => {
    if (!confirm("Are you sure you want to delete this note?")) return;

    try {
      await apiClient.deleteActivityNote(noteId);
      setNotes((prev) => prev.filter((note) => note.id !== noteId));
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "call":
        return <Phone className="h-5 w-5" />;
      case "email":
        return <Mail className="h-5 w-5" />;
      case "meeting":
        return <Users className="h-5 w-5" />;
      case "note":
        return <FileText className="h-5 w-5" />;
      case "task":
        return <ListTodo className="h-5 w-5" />;
      default:
        return <Calendar className="h-5 w-5" />;
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
          <div className="text-lg">Loading activity...</div>
        </div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="px-6">
        <div className="text-center py-12">
          <div className="text-lg">Activity not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => navigate("/activities")}
            className="flex items-center"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Activities
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center space-x-3">
              <div
                className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${getActivityTypeColor(
                  activity.type
                )}`}
              >
                {getActivityIcon(activity.type)}
                <span className="capitalize">{activity.type}</span>
              </div>
              <span>{activity.subject}</span>
            </h1>
            <p className="text-muted-foreground">
              {activity.description && <span>{activity.description} • </span>}
              Created {formatDateTime(activity.created_at)}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Activity
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Activity Information */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Activity Details</span>
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
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-4">
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
                      <Input
                        type="date"
                        value={formData.dueDate}
                        onChange={(e) =>
                          handleInputChange("dueDate", e.target.value)
                        }
                      />
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
                          <option
                            key={contact.id}
                            value={contact.id.toString()}
                          >
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
                        <option value="">Select Organization</option>
                        {organizations.map((organization) => (
                          <option
                            key={organization.id}
                            value={organization.id.toString()}
                          >
                            {organization.name}
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

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="completed"
                      checked={formData.completed}
                      onChange={(e) =>
                        handleInputChange("completed", e.target.checked)
                      }
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="completed" className="text-sm font-medium">
                      Mark as completed
                    </label>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">
                        Subject
                      </h4>
                      <p className="mt-1">{activity.subject}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">
                        Type
                      </h4>
                      <p className="mt-1 capitalize">{activity.type}</p>
                    </div>
                  </div>

                  {activity.description && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">
                        Description
                      </h4>
                      <p className="mt-1">{activity.description}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-6">
                    {activity.dueDate && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground">
                          Due Date
                        </h4>
                        <p className="mt-1">{formatDate(activity.dueDate)}</p>
                      </div>
                    )}
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">
                        Status
                      </h4>
                      <p className="mt-1">
                        {activity.completed ? "Completed" : "Pending"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-6">
                    {activity.contact_name && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground">
                          Contact
                        </h4>
                        <p className="mt-1">{activity.contact_name}</p>
                      </div>
                    )}
                    {activity.company_name && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground">
                          Company
                        </h4>
                        <p className="mt-1">{activity.company_name}</p>
                      </div>
                    )}
                    {activity.deal_title && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground">
                          Deal
                        </h4>
                        <p className="mt-1">{activity.deal_title}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Notes Section */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MessageCircle className="h-5 w-5" />
                  <span>Notes</span>
                </div>
                <Button
                  size="sm"
                  onClick={() => setShowAddNote(true)}
                  className="flex items-center"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add Note
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {showAddNote && (
                <div className="mb-4 p-4 border rounded-lg">
                  <Textarea
                    placeholder="Add your note..."
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    rows={3}
                    className="mb-3"
                  />
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowAddNote(false);
                        setNewNoteContent("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleAddNote}>
                      Add Note
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {notes.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No notes yet. Add a note to get started.
                  </p>
                ) : (
                  notes.map((note) => (
                    <div key={note.id} className="border rounded-lg p-4">
                      {editingNoteId === note.id ? (
                        <div>
                          <Textarea
                            value={editingNoteContent}
                            onChange={(e) =>
                              setEditingNoteContent(e.target.value)
                            }
                            rows={3}
                            className="mb-3"
                          />
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingNoteId(null);
                                setEditingNoteContent("");
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleEditNote(note.id)}
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="mb-3">{note.content}</p>
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>
                              By {note.authorName} •{" "}
                              {formatDateTime(note.createdAt)}
                              {note.updatedAt !== note.createdAt && (
                                <span> (edited)</span>
                              )}
                            </span>
                            <div className="flex space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingNoteId(note.id);
                                  setEditingNoteContent(note.content);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteNote(note.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
