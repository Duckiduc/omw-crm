import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
import type { DealWithDetails, DealStage, Company, Contact } from "../lib/api";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  TrendingUp,
  DollarSign,
  Calendar,
  Building2,
  User,
  Share2,
} from "lucide-react";

interface DealFormData {
  title: string;
  value: string;
  stage_id: string;
  company_id: string;
  contact_id: string;
  expected_close_date: string;
  notes: string;
}

export default function DealsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [deals, setDeals] = useState<DealWithDetails[]>([]);
  const [dealStages, setDealStages] = useState<DealStage[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingDeal, setEditingDeal] = useState<DealWithDetails | null>(null);

  // Check if we should automatically open the form (from Dashboard navigation)
  useEffect(() => {
    if (location.state?.openForm) {
      setShowForm(true);
      // Clear the state to prevent reopening on future navigations
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);
  const [formData, setFormData] = useState<DealFormData>({
    title: "",
    value: "",
    stage_id: "",
    company_id: "",
    contact_id: "",
    expected_close_date: "",
    notes: "",
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
        // Fetch deal stages
        const stagesResponse = await apiClient.getDealStages();
        if (stagesResponse.data) {
          setDealStages(stagesResponse.data);
        }

        // Fetch companies for dropdown
        const companiesResponse = await apiClient.getCompanies({ limit: 100 });
        if (companiesResponse.data) {
          setCompanies(companiesResponse.data.companies);
        }

        // Fetch contacts for dropdown
        const contactsResponse = await apiClient.getContacts({ limit: 100 });
        if (contactsResponse.data) {
          setContacts(contactsResponse.data.contacts);
        }
      } catch (error) {
        console.error("Error fetching initial data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  useEffect(() => {
    const fetchDeals = async () => {
      if (dealStages.length === 0) return;

      try {
        const response = await apiClient.getDeals({
          page: currentPage,
          limit: 20,
          search: searchTerm || undefined,
          stageId: filterStage ? parseInt(filterStage) : undefined,
        });

        if (response.data) {
          setDeals(response.data.deals);
          setTotalPages(response.data.pagination.totalPages);
        }
      } catch (error) {
        console.error("Error fetching deals:", error);
      }
    };

    fetchDeals();
  }, [currentPage, searchTerm, filterStage, dealStages.length]);

  const fetchDeals = async () => {
    try {
      const response = await apiClient.getDeals({
        page: currentPage,
        limit: 20,
        search: searchTerm || undefined,
        stageId: filterStage ? parseInt(filterStage) : undefined,
      });

      if (response.data) {
        setDeals(response.data.deals);
        setTotalPages(response.data.pagination.totalPages);
      }
    } catch (error) {
      console.error("Error fetching deals:", error);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.title.trim()) {
      errors.title = "Deal title is required";
    }
    if (!formData.value || parseFloat(formData.value) < 0) {
      errors.value = "Valid deal value is required";
    }
    if (!formData.stage_id) {
      errors.stage_id = "Deal stage is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const dealData = {
        title: formData.title,
        value: parseFloat(formData.value),
        currency: "USD",
        stageId: parseInt(formData.stage_id),
        companyId: formData.company_id
          ? parseInt(formData.company_id)
          : undefined,
        contactId: formData.contact_id
          ? parseInt(formData.contact_id)
          : undefined,
        expectedCloseDate: formData.expected_close_date || undefined,
        probability: 50, // Default probability
        notes: formData.notes || undefined,
      };

      if (editingDeal) {
        await apiClient.updateDeal(editingDeal.id, dealData);
      } else {
        await apiClient.createDeal(dealData);
      }

      resetForm();
      fetchDeals();
    } catch (error) {
      console.error("Error saving deal:", error);
    }
  };

  const handleEdit = (deal: DealWithDetails) => {
    setEditingDeal(deal);
    setFormData({
      title: deal.title,
      value: deal.value.toString(),
      stage_id: deal.stage_id?.toString() || "",
      company_id: deal.company_id?.toString() || "",
      contact_id: deal.contact_id?.toString() || "",
      expected_close_date: deal.expected_close_date
        ? (() => {
            const date = new Date(deal.expected_close_date);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            return `${year}-${month}-${day}`;
          })()
        : "",
      notes: deal.notes || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (dealId: number) => {
    if (!confirm("Are you sure you want to delete this deal?")) return;

    try {
      await apiClient.deleteDeal(dealId);
      fetchDeals();
    } catch (error) {
      console.error("Error deleting deal:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      value: "",
      stage_id: "",
      company_id: "",
      contact_id: "",
      expected_close_date: "",
      notes: "",
    });
    setFormErrors({});
    setEditingDeal(null);
    setShowForm(false);
    setShowCalendar(false);
  };

  const handleInputChange = (field: keyof DealFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const getStageColor = (stageName: string) => {
    const stage = stageName.toLowerCase();
    if (stage.includes("lead") || stage.includes("prospect"))
      return "secondary";
    if (stage.includes("qualified") || stage.includes("proposal"))
      return "default";
    if (stage.includes("negotiation") || stage.includes("contract"))
      return "secondary";
    if (stage.includes("won") || stage.includes("closed")) return "default";
    if (stage.includes("lost")) return "destructive";
    return "secondary";
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="px-6">
        <div className="text-center py-12">
          <div className="text-lg">Loading deals...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Deals & Opportunities</h1>
          <p className="text-muted-foreground">Track your sales pipeline</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Deal
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search deals..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value)}
            >
              <option value="">All Stages</option>
              {dealStages.map((stage) => (
                <option key={stage.id} value={stage.id.toString()}>
                  {stage.name}
                </option>
              ))}
            </Select>
            <Button type="submit">Search</Button>
            {(searchTerm || filterStage) && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setFilterStage("");
                  setCurrentPage(1);
                }}
              >
                Clear
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Deal Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>
                {editingDeal ? "Edit Deal" : "Add New Deal"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Deal Title *</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                    className={formErrors.title ? "border-destructive" : ""}
                  />
                  {formErrors.title && (
                    <p className="text-sm text-destructive mt-1">
                      {formErrors.title}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Deal Value *</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.value}
                      onChange={(e) =>
                        handleInputChange("value", e.target.value)
                      }
                      className={formErrors.value ? "border-destructive" : ""}
                    />
                    {formErrors.value && (
                      <p className="text-sm text-destructive mt-1">
                        {formErrors.value}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium">Stage *</label>
                    <Select
                      value={formData.stage_id}
                      onChange={(e) =>
                        handleInputChange("stage_id", e.target.value)
                      }
                      className={
                        formErrors.stage_id ? "border-destructive" : ""
                      }
                    >
                      <option value="">Select Stage</option>
                      {dealStages.map((stage) => (
                        <option key={stage.id} value={stage.id.toString()}>
                          {stage.name}
                        </option>
                      ))}
                    </Select>
                    {formErrors.stage_id && (
                      <p className="text-sm text-destructive mt-1">
                        {formErrors.stage_id}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Company</label>
                    <Select
                      value={formData.company_id}
                      onChange={(e) =>
                        handleInputChange("company_id", e.target.value)
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
                    <label className="text-sm font-medium">Contact</label>
                    <Select
                      value={formData.contact_id}
                      onChange={(e) =>
                        handleInputChange("contact_id", e.target.value)
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
                </div>

                <div>
                  <label className="text-sm font-medium">
                    Expected Close Date
                  </label>
                  <div className="relative">
                    <Input
                      type="text"
                      value={(() => {
                        if (formData.expected_close_date) {
                          try {
                            const displayDate = new Date(
                              formData.expected_close_date + "T00:00:00"
                            ).toLocaleDateString();
                            return displayDate;
                          } catch (error) {
                            console.error(
                              "Error formatting date for display:",
                              error
                            );
                            return formData.expected_close_date;
                          }
                        }
                        return "";
                      })()}
                      onClick={() => setShowCalendar(!showCalendar)}
                      readOnly
                      placeholder="Select expected close date"
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
                            formData.expected_close_date
                              ? new Date(
                                  formData.expected_close_date + "T00:00:00"
                                )
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
                              handleInputChange(
                                "expected_close_date",
                                localDateString
                              );
                            } else {
                              handleInputChange("expected_close_date", "");
                            }
                            setShowCalendar(false);
                          }}
                          className="rounded-lg border-0"
                        />
                      </div>
                    )}
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

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingDeal ? "Update Deal" : "Create Deal"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Deals List */}
      <div className="space-y-4">
        {deals.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No deals found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || filterStage
                  ? "No deals match your search."
                  : "Get started by adding your first deal."}
              </p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Deal
              </Button>
            </CardContent>
          </Card>
        ) : (
          deals.map((deal) => (
            <Card key={deal.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold">{deal.title}</h3>
                      <Badge variant={getStageColor(deal.stage_name || "")}>
                        {deal.stage_name}
                      </Badge>
                    </div>

                    <div className="flex items-center space-x-6 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center">
                        <DollarSign className="mr-1 h-4 w-4" />
                        <span className="font-medium text-foreground">
                          {formatCurrency(deal.value)}
                        </span>
                      </div>

                      {deal.company_name && (
                        <div className="flex items-center">
                          <Building2 className="mr-1 h-4 w-4" />
                          <span>{deal.company_name}</span>
                        </div>
                      )}

                      {deal.contact_name && (
                        <div className="flex items-center">
                          <User className="mr-1 h-4 w-4" />
                          <span>{deal.contact_name}</span>
                        </div>
                      )}

                      {deal.expected_close_date && (
                        <div className="flex items-center">
                          <Calendar className="mr-1 h-4 w-4" />
                          <span>
                            Close: {formatDate(deal.expected_close_date)}
                          </span>
                        </div>
                      )}
                    </div>

                    {deal.notes && (
                      <p className="text-sm text-muted-foreground">
                        {deal.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(deal)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShareModal({
                          isOpen: true,
                          resourceType: "deal",
                          resourceId: deal.id,
                          resourceTitle: deal.title,
                        });
                      }}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(deal.id)}
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
