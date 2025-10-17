import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import { apiClient } from "../lib/api";
import type { Contact, Company, ContactNote } from "../lib/api";
import {
  ArrowLeft,
  Edit,
  Plus,
  Trash2,
  Building2,
  Mail,
  Phone,
  User,
  Calendar,
  MessageCircle,
  Save,
  X,
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
  status: "hot" | "warm" | "cold" | "all_good";
}

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contact, setContact] = useState<Contact | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [editingNote, setEditingNote] = useState<ContactNote | null>(null);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [formData, setFormData] = useState<ContactFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    position: "",
    companyId: "",
    notes: "",
    tags: [],
    status: "all_good",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!id) return;

    const fetchContactData = async () => {
      setIsLoading(true);
      try {
        const [contactResponse, notesResponse] = await Promise.all([
          apiClient.getContact(parseInt(id)),
          apiClient.getContactNotes(parseInt(id)),
        ]);

        if (contactResponse.data) {
          setContact(contactResponse.data);
          setFormData({
            firstName: contactResponse.data.firstName,
            lastName: contactResponse.data.lastName,
            email: contactResponse.data.email || "",
            phone: contactResponse.data.phone || "",
            position: contactResponse.data.position || "",
            companyId: contactResponse.data.companyId?.toString() || "",
            notes: contactResponse.data.notes || "",
            tags: contactResponse.data.tags || [],
            status: contactResponse.data.status || "all_good",
          });
        }

        if (notesResponse.data) {
          setNotes(notesResponse.data.notes);
        }
      } catch (error) {
        console.error("Error fetching contact data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContactData();
    fetchCompanies();
    fetchTags();
  }, [id]);

  const fetchContactData = async () => {
    if (!id) return;

    try {
      const [contactResponse, notesResponse] = await Promise.all([
        apiClient.getContact(parseInt(id)),
        apiClient.getContactNotes(parseInt(id)),
      ]);

      if (contactResponse.data) {
        setContact(contactResponse.data);
        setFormData({
          firstName: contactResponse.data.firstName,
          lastName: contactResponse.data.lastName,
          email: contactResponse.data.email || "",
          phone: contactResponse.data.phone || "",
          position: contactResponse.data.position || "",
          companyId: contactResponse.data.companyId?.toString() || "",
          notes: contactResponse.data.notes || "",
          tags: contactResponse.data.tags || [],
          status: contactResponse.data.status || "all_good",
        });
      }

      if (notesResponse.data) {
        setNotes(notesResponse.data.notes);
      }
    } catch (error) {
      console.error("Error fetching contact data:", error);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await apiClient.getCompanies({ limit: 100 });
      if (response.data) {
        setCompanies(response.data.companies);
      }
    } catch (error) {
      console.error("Error fetching companies:", error);
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

  const handleSave = async () => {
    if (!contact || !validateForm()) return;

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

      await apiClient.updateContact(contact.id, contactData);
      setIsEditing(false);
      fetchContactData();
      fetchTags();
    } catch (error) {
      console.error("Error updating contact:", error);
    }
  };

  const handleCancel = () => {
    if (contact) {
      setFormData({
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email || "",
        phone: contact.phone || "",
        position: contact.position || "",
        companyId: contact.companyId?.toString() || "",
        notes: contact.notes || "",
        tags: contact.tags || [],
        status: contact.status || "all_good",
      });
    }
    setFormErrors({});
    setIsEditing(false);
  };

  const handleAddNote = async () => {
    if (!id || !newNoteContent.trim()) return;

    try {
      await apiClient.createContactNote({
        contactId: parseInt(id),
        content: newNoteContent.trim(),
      });
      setNewNoteContent("");
      setShowNoteForm(false);
      fetchContactData();
    } catch (error) {
      console.error("Error creating note:", error);
    }
  };

  const handleUpdateNote = async (noteId: number, content: string) => {
    try {
      await apiClient.updateContactNote(noteId, content);
      setEditingNote(null);
      fetchContactData();
    } catch (error) {
      console.error("Error updating note:", error);
    }
  };

  const handleDeleteNote = async (noteId: number) => {
    if (!confirm("Are you sure you want to delete this note?")) return;

    try {
      await apiClient.deleteContactNote(noteId);
      fetchContactData();
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  };

  const handleInputChange = (
    field: keyof ContactFormData,
    value: string | string[]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="px-6">
        <div className="text-center py-12">
          <div className="text-lg">Loading contact details...</div>
        </div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="px-6">
        <div className="text-center py-12">
          <div className="text-lg">Contact not found</div>
          <Button onClick={() => navigate("/contacts")} className="mt-4">
            Back to Contacts
          </Button>
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
            onClick={() => navigate("/contacts")}
            className="flex items-center"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Contacts
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {contact.firstName} {contact.lastName}
            </h1>
            <p className="text-muted-foreground">Contact Details</p>
          </div>
        </div>
        <div className="flex space-x-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancel}>
                <X className="mr-2 h-4 w-4" />
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
              Edit Contact
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Information */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">
                        First Name *
                      </label>
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
                    <label className="text-sm font-medium">Tags</label>
                    <TagInput
                      tags={formData.tags}
                      onChange={(tags) => handleInputChange("tags", tags)}
                      suggestions={availableTags}
                      placeholder="Add tags to categorize contact..."
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <ContactStatusSelect
                      value={formData.status}
                      onChange={(status) => handleInputChange("status", status)}
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    {contact.email && (
                      <div className="flex items-center">
                        <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                        <a
                          href={`mailto:${contact.email}`}
                          className="text-primary hover:underline"
                        >
                          {contact.email}
                        </a>
                      </div>
                    )}
                    {contact.phone && (
                      <div className="flex items-center">
                        <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
                        <a
                          href={`tel:${contact.phone}`}
                          className="text-primary hover:underline"
                        >
                          {contact.phone}
                        </a>
                      </div>
                    )}
                  </div>

                  {contact.position && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">
                        Position:{" "}
                      </span>
                      <span>{contact.position}</span>
                    </div>
                  )}

                  {contact.company_name && (
                    <div className="flex items-center">
                      <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>{contact.company_name}</span>
                    </div>
                  )}

                  {contact.tags && contact.tags.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground block mb-2">
                        Tags:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {contact.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <span className="text-sm font-medium text-muted-foreground block mb-2">
                      Status:
                    </span>
                    <ContactStatusBadge status={contact.status || "all_good"} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Background/Notes Section */}
          <Card>
            <CardHeader>
              <CardTitle>Background</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div>
                  <label className="text-sm font-medium">
                    Background Information
                  </label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                    rows={4}
                    placeholder="Add background information about this contact..."
                  />
                </div>
              ) : (
                <div>
                  {contact.notes ? (
                    <p className="whitespace-pre-wrap">{contact.notes}</p>
                  ) : (
                    <p className="text-muted-foreground italic">
                      No background information available
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Quick Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                Quick Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="text-sm font-medium text-muted-foreground">
                  Created:{" "}
                </span>
                <span className="text-sm">
                  {formatDate(contact.created_at)}
                </span>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">
                  Last Updated:{" "}
                </span>
                <span className="text-sm">
                  {formatDate(contact.updated_at)}
                </span>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">
                  Notes Count:{" "}
                </span>
                <span className="text-sm">{notes.length}</span>
              </div>
            </CardContent>
          </Card>

          {/* Notes Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <MessageCircle className="mr-2 h-5 w-5" />
                  Notes ({notes.length})
                </CardTitle>
                <Button
                  size="sm"
                  onClick={() => setShowNoteForm(true)}
                  disabled={showNoteForm}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add Note
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 max-h-96 overflow-y-auto">
              {showNoteForm && (
                <div className="space-y-2 p-3 border border-border rounded-md bg-accent/50">
                  <Textarea
                    placeholder="Add a new note..."
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    rows={3}
                  />
                  <div className="flex justify-end space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowNoteForm(false);
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

              {notes.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No notes yet. Add your first note above.
                </p>
              ) : (
                notes.map((note) => (
                  <div
                    key={note.id}
                    className="border border-border rounded-md p-3 space-y-2"
                  >
                    {editingNote?.id === note.id ? (
                      <div className="space-y-2">
                        <Textarea
                          defaultValue={note.content}
                          onBlur={(e) => {
                            if (e.target.value.trim() !== note.content) {
                              handleUpdateNote(note.id, e.target.value.trim());
                            } else {
                              setEditingNote(null);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") {
                              setEditingNote(null);
                            } else if (e.key === "Enter" && e.metaKey) {
                              const target = e.target as HTMLTextAreaElement;
                              handleUpdateNote(note.id, target.value.trim());
                            }
                          }}
                          rows={3}
                          autoFocus
                        />
                        <div className="text-xs text-muted-foreground">
                          Press Cmd+Enter to save, Escape to cancel
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="whitespace-pre-wrap text-sm">
                          {note.content}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-muted-foreground">
                            <div>{note.authorName}</div>
                            <div>{formatDate(note.createdAt)}</div>
                            {note.updatedAt !== note.createdAt && (
                              <div>Updated: {formatDate(note.updatedAt)}</div>
                            )}
                          </div>
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingNote(note)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteNote(note.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
