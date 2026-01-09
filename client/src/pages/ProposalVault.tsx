import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Sidebar, MobileHeader } from "@/components/Sidebar";
import { 
  FileText, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  Download,
  Eye,
  Play,
  Loader2,
  FileCheck,
  ArrowRight,
  ExternalLink,
  Building2,
  MapPin,
  DollarSign,
  Layers,
  Plus,
  Trash2,
  Sparkles
} from "lucide-react";
import { format } from "date-fns";
import type { PandaDocDocument, PandaDocImportBatch } from "@shared/schema";

interface AreaData {
  name: string;
  sqft?: number;
  kind?: "building" | "landscape";
  buildingType?: string;
  lod?: string;
  scope?: string;
  disciplines?: string[];
  price?: number;
}

interface ServiceData {
  name: string;
  description?: string;
  price?: number;
  quantity?: number;
  rate?: number;
}

interface ExtractedData {
  projectName?: string;
  clientName?: string;
  projectAddress?: string;
  totalPrice?: number;
  currency?: string;
  areas?: AreaData[];
  services?: ServiceData[];
  contacts?: Array<{ name: string; email: string; company?: string; phone?: string }>;
  variables?: Record<string, string>;
  confidence: number;
  unmappedFields?: string[];
  pricingBreakdown?: Array<{ label: string; value: number }>;
  travelDistance?: number;
  travelCost?: number;
  scanningCost?: number;
  modelingCost?: number;
  targetMargin?: number;
  pricingMode?: "standard" | "tierA";
}

interface PandaDocStats {
  configured: boolean;
  totalBatches: number;
  totalDocuments: number;
  pendingReview: number;
  approved: number;
  rejected: number;
  errors: number;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
    pending: { variant: "secondary", icon: <Clock className="h-3 w-3" /> },
    fetching: { variant: "outline", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
    extracted: { variant: "default", icon: <Eye className="h-3 w-3" /> },
    needs_review: { variant: "default", icon: <Eye className="h-3 w-3" /> },
    approved: { variant: "outline", icon: <CheckCircle className="h-3 w-3 text-green-500" /> },
    rejected: { variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
    error: { variant: "destructive", icon: <AlertCircle className="h-3 w-3" /> },
    in_progress: { variant: "outline", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
    completed: { variant: "outline", icon: <CheckCircle className="h-3 w-3 text-green-500" /> },
    partial: { variant: "secondary", icon: <AlertCircle className="h-3 w-3" /> },
    failed: { variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
  };
  const { variant, icon } = config[status] || { variant: "secondary" as const, icon: null };
  
  return (
    <Badge variant={variant} className="gap-1">
      {icon}
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

function StageBadge({ stage }: { stage: string | null | undefined }) {
  const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    proposal_pending: { label: "Proposal", variant: "secondary" },
    awaiting_internal: { label: "Awaiting Approval", variant: "outline" },
    closed_won: { label: "Closed Won", variant: "default" },
    closed_lost: { label: "Closed Lost", variant: "destructive" },
    unknown: { label: "Unknown", variant: "secondary" },
  };
  const { label, variant } = config[stage || "unknown"] || config.unknown;
  
  return (
    <Badge variant={variant} className="gap-1">
      {label}
    </Badge>
  );
}

function DocumentReviewDialog({ 
  document, 
  open, 
  onOpenChange 
}: { 
  document: PandaDocDocument | null; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [editedData, setEditedData] = useState<Partial<ExtractedData>>({});
  const [reviewNotes, setReviewNotes] = useState("");
  const [lastDocId, setLastDocId] = useState<number | null>(null);
  const [editedAreas, setEditedAreas] = useState<AreaData[]>([]);
  const [editedServices, setEditedServices] = useState<ServiceData[]>([]);

  const extracted = document?.extractedData as ExtractedData | null;

  if (document && document.id !== lastDocId) {
    setEditedData({});
    setReviewNotes("");
    setEditedAreas(extracted?.areas || []);
    setEditedServices(extracted?.services || []);
    setLastDocId(document.id);
  }

  const approveMutation = useMutation({
    mutationFn: async () => {
      const finalData = {
        ...editedData,
        areas: editedAreas.length > 0 ? editedAreas : undefined,
        services: editedServices.length > 0 ? editedServices : undefined,
      };
      return apiRequest(
        "POST",
        `/api/pandadoc/documents/${document?.id}/approve`,
        { editedData: Object.keys(finalData).length ? finalData : undefined, reviewNotes }
      );
    },
    onSuccess: (data: any) => {
      toast({ title: "Document approved", description: `CPQ Quote ${data.quote?.quoteNumber} created` });
      queryClient.invalidateQueries({ queryKey: ["/api/pandadoc/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pandadoc/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pandadoc/batches"] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(
        "POST",
        `/api/pandadoc/documents/${document?.id}/reject`,
        { reviewNotes }
      );
    },
    onSuccess: () => {
      toast({ title: "Document rejected" });
      queryClient.invalidateQueries({ queryKey: ["/api/pandadoc/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pandadoc/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pandadoc/batches"] });
      onOpenChange(false);
    },
  });

  const addArea = () => {
    setEditedAreas([...editedAreas, { name: `Area ${editedAreas.length + 1}`, sqft: 5000, kind: "building", buildingType: "Commercial" }]);
  };

  const updateArea = (index: number, updates: Partial<AreaData>) => {
    setEditedAreas(editedAreas.map((a, i) => i === index ? { ...a, ...updates } : a));
  };

  const removeArea = (index: number) => {
    setEditedAreas(editedAreas.filter((_, i) => i !== index));
  };

  const addService = () => {
    setEditedServices([...editedServices, { name: "New Service", price: 0, quantity: 1 }]);
  };

  const updateService = (index: number, updates: Partial<ServiceData>) => {
    setEditedServices(editedServices.map((s, i) => i === index ? { ...s, ...updates } : s));
  };

  const removeService = (index: number) => {
    setEditedServices(editedServices.filter((_, i) => i !== index));
  };

  const totalSqft = editedAreas.reduce((sum, a) => sum + (a.sqft || 0), 0);
  const calculatedTotal = editedServices.reduce((sum, s) => sum + ((s.price || 0) * (s.quantity || 1)), 0);
  const displayTotal = editedData.totalPrice ?? extracted?.totalPrice ?? calculatedTotal;

  if (!document || !extracted) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4 pb-2 border-b">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Review: {document.pandaDocName}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-4 mt-1">
                <span>AI-extracted data ready for review</span>
                <Badge variant={extracted.confidence >= 80 ? "default" : extracted.confidence >= 50 ? "secondary" : "destructive"}>
                  <Sparkles className="h-3 w-3 mr-1" />
                  {extracted.confidence}% confidence
                </Badge>
                <StageBadge stage={document.pandaDocStage} />
              </DialogDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
                <a href={`/api/pandadoc/documents/${document.id}/pdf`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Original PDF
                </a>
              </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-6 max-w-3xl">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Project Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Project Name</Label>
                    <Input 
                      value={editedData.projectName ?? extracted.projectName ?? ""} 
                      onChange={(e) => setEditedData(prev => ({ ...prev, projectName: e.target.value }))}
                      data-testid="input-project-name"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Client Name</Label>
                    <Input 
                      value={editedData.clientName ?? extracted.clientName ?? ""} 
                      onChange={(e) => setEditedData(prev => ({ ...prev, clientName: e.target.value }))}
                      data-testid="input-client-name"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs text-muted-foreground">Project Address</Label>
                    <Input 
                      value={editedData.projectAddress ?? extracted.projectAddress ?? ""} 
                      onChange={(e) => setEditedData(prev => ({ ...prev, projectAddress: e.target.value }))}
                      data-testid="input-project-address"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Project Areas
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{totalSqft.toLocaleString()} sqft total</Badge>
                      <Button size="sm" variant="outline" onClick={addArea} data-testid="button-add-area">
                        <Plus className="h-4 w-4 mr-1" />
                        Add Area
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {editedAreas.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No areas extracted</p>
                      <Button size="sm" variant="ghost" onClick={addArea} className="mt-2" data-testid="button-add-area-empty">
                        <Plus className="h-4 w-4 mr-1" />
                        Add Building Area
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {editedAreas.map((area, index) => (
                        <div key={index} className="p-3 rounded-lg border bg-muted/20 space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Badge variant={area.kind === "landscape" ? "secondary" : "default"}>
                                {area.kind === "landscape" ? "Landscape" : "Building"}
                              </Badge>
                              <Input 
                                value={area.name}
                                onChange={(e) => updateArea(index, { name: e.target.value })}
                                className="h-8 w-40"
                                data-testid={`input-area-name-${index}`}
                              />
                            </div>
                            <Button size="icon" variant="ghost" onClick={() => removeArea(index)} data-testid={`button-remove-area-${index}`}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                              <Label className="text-xs">Square Feet</Label>
                              <Input 
                                type="number"
                                value={area.sqft || ""}
                                onChange={(e) => updateArea(index, { sqft: parseInt(e.target.value) || 0 })}
                                data-testid={`input-area-sqft-${index}`}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Building Type</Label>
                              <Select 
                                value={area.buildingType || undefined} 
                                onValueChange={(v) => updateArea(index, { buildingType: v })}
                              >
                                <SelectTrigger data-testid={`select-building-type-${index}`}>
                                  <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Commercial">Commercial</SelectItem>
                                  <SelectItem value="Industrial">Industrial</SelectItem>
                                  <SelectItem value="Residential">Residential</SelectItem>
                                  <SelectItem value="Healthcare">Healthcare</SelectItem>
                                  <SelectItem value="Education">Education</SelectItem>
                                  <SelectItem value="Retail">Retail</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">LOD</Label>
                              <Select 
                                value={area.lod || undefined} 
                                onValueChange={(v) => updateArea(index, { lod: v })}
                              >
                                <SelectTrigger data-testid={`select-lod-${index}`}>
                                  <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="100">LOD 100</SelectItem>
                                  <SelectItem value="200">LOD 200</SelectItem>
                                  <SelectItem value="300">LOD 300</SelectItem>
                                  <SelectItem value="350">LOD 350</SelectItem>
                                  <SelectItem value="400">LOD 400</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">Scope</Label>
                              <Select 
                                value={area.scope || undefined} 
                                onValueChange={(v) => updateArea(index, { scope: v })}
                              >
                                <SelectTrigger data-testid={`select-scope-${index}`}>
                                  <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Full">Full</SelectItem>
                                  <SelectItem value="Shell">Shell</SelectItem>
                                  <SelectItem value="Exterior">Exterior</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      Services & Line Items
                    </CardTitle>
                    <Button size="sm" variant="outline" onClick={addService} data-testid="button-add-service">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Service
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {editedServices.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No services extracted from proposal</p>
                      <Button size="sm" variant="ghost" onClick={addService} className="mt-2" data-testid="button-add-service-empty">
                        <Plus className="h-4 w-4 mr-1" />
                        Add Service
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {editedServices.map((service, index) => (
                        <div key={index} className="flex items-center gap-3 p-2 rounded border">
                          <div className="flex-1">
                            <Input 
                              value={service.name}
                              onChange={(e) => updateService(index, { name: e.target.value })}
                              placeholder="Service name"
                              className="h-8"
                              data-testid={`input-service-name-${index}`}
                            />
                          </div>
                          <div className="w-20">
                            <Input 
                              type="number"
                              value={service.quantity || 1}
                              onChange={(e) => updateService(index, { quantity: parseInt(e.target.value) || 1 })}
                              className="h-8 text-center"
                              data-testid={`input-service-qty-${index}`}
                            />
                          </div>
                          <div className="w-32">
                            <div className="relative">
                              <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                              <Input 
                                type="number"
                                value={service.price || ""}
                                onChange={(e) => updateService(index, { price: parseFloat(e.target.value) || 0 })}
                                className="h-8 pl-6"
                                data-testid={`input-service-price-${index}`}
                              />
                            </div>
                          </div>
                          <div className="w-28 text-right font-mono text-sm">
                            ${((service.price || 0) * (service.quantity || 1)).toLocaleString()}
                          </div>
                          <Button size="icon" variant="ghost" onClick={() => removeService(index)} data-testid={`button-remove-service-${index}`}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Contacts</CardTitle>
                </CardHeader>
                <CardContent>
                  {extracted.contacts && extracted.contacts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {extracted.contacts.map((contact, i) => (
                        <div key={i} className="p-3 rounded border">
                          <div className="font-medium">{contact.name}</div>
                          <div className="text-sm text-muted-foreground">{contact.email}</div>
                          {contact.phone && <div className="text-sm text-muted-foreground">{contact.phone}</div>}
                          {contact.company && <div className="text-xs text-muted-foreground">{contact.company}</div>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No contacts extracted</p>
                  )}
                </CardContent>
              </Card>

              <div>
                <Label>Review Notes</Label>
                <Textarea 
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add any notes about this review..."
                  data-testid="input-review-notes"
                />
              </div>
            </div>
          </ScrollArea>

          <div className="w-80 border-l bg-muted/20 flex flex-col">
            <div className="p-4 border-b">
              <h2 className="font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Pricing Summary
              </h2>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-2">
                {editedServices.map((service, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="truncate flex-1 mr-2">{service.name}</span>
                    <span className="font-mono">${((service.price || 0) * (service.quantity || 1)).toLocaleString()}</span>
                  </div>
                ))}
                {editedServices.length === 0 && extracted.pricingBreakdown?.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="truncate flex-1 mr-2">{item.label}</span>
                    <span className="font-mono">${item.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <Separator />

            <div className="p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total</span>
                <div className="text-right">
                  <Input 
                    type="number"
                    value={displayTotal}
                    onChange={(e) => setEditedData(prev => ({ ...prev, totalPrice: parseFloat(e.target.value) }))}
                    className="h-8 w-32 text-right font-bold"
                    data-testid="input-total-price"
                  />
                </div>
              </div>

              {totalSqft > 0 && (
                <div className="text-xs text-muted-foreground text-right">
                  ${(displayTotal / totalSqft).toFixed(2)}/sqft
                </div>
              )}

              {extracted.unmappedFields && extracted.unmappedFields.length > 0 && (
                <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20">
                  <div className="text-xs font-medium text-amber-600 mb-1">Unmapped Fields</div>
                  <div className="text-xs text-amber-600/80 space-y-0.5">
                    {extracted.unmappedFields.slice(0, 5).map((field, i) => (
                      <div key={i} className="truncate">{field}</div>
                    ))}
                    {extracted.unmappedFields.length > 5 && (
                      <div>+{extracted.unmappedFields.length - 5} more...</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t space-y-2">
              <Button 
                className="w-full"
                onClick={() => approveMutation.mutate()}
                disabled={approveMutation.isPending}
                data-testid="button-approve-document"
              >
                {approveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                Approve & Create Quote
              </Button>
              <Button 
                className="w-full"
                variant="outline" 
                onClick={() => rejectMutation.mutate()}
                disabled={rejectMutation.isPending}
                data-testid="button-reject-document"
              >
                {rejectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                Reject
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ProposalVault() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("documents");
  const [selectedDocument, setSelectedDocument] = useState<PandaDocDocument | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery<PandaDocStats>({
    queryKey: ["/api/pandadoc/status"],
  });

  const { data: documents = [], isLoading: docsLoading, refetch: refetchDocs } = useQuery<PandaDocDocument[]>({
    queryKey: ["/api/pandadoc/documents"],
  });

  const { data: batches = [], isLoading: batchesLoading } = useQuery<PandaDocImportBatch[]>({
    queryKey: ["/api/pandadoc/batches"],
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/pandadoc/sync");
    },
    onSuccess: (data: any) => {
      toast({ title: "Sync Complete", description: `Found ${data.documentsFound} documents, imported ${data.documentsImported} new` });
      queryClient.invalidateQueries({ queryKey: ["/api/pandadoc/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pandadoc/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pandadoc/batches"] });
    },
    onError: (error: Error) => {
      toast({ title: "Sync Failed", description: error.message, variant: "destructive" });
    },
  });

  const processAllMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/pandadoc/process-all-pending");
    },
    onSuccess: (data: any) => {
      toast({ title: "Processing Complete", description: `Processed ${data.processed} documents` });
      queryClient.invalidateQueries({ queryKey: ["/api/pandadoc/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pandadoc/documents"] });
    },
    onError: (error: Error) => {
      toast({ title: "Processing Failed", description: error.message, variant: "destructive" });
    },
  });

  const processDocMutation = useMutation({
    mutationFn: async (docId: number) => {
      return apiRequest("POST", `/api/pandadoc/documents/${docId}/process`);
    },
    onSuccess: () => {
      toast({ title: "Document Processed" });
      queryClient.invalidateQueries({ queryKey: ["/api/pandadoc/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pandadoc/documents"] });
    },
  });

  const pendingCount = documents.filter(d => d.importStatus === "pending").length;
  const reviewCount = documents.filter(d => d.importStatus === "extracted" || d.importStatus === "needs_review").length;
  const approvedCount = documents.filter(d => d.importStatus === "approved").length;

  if (!stats?.configured) {
    return (
      <div className="flex min-h-screen bg-background text-foreground">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <MobileHeader />
          <main className="flex-1 p-4 md:p-8 overflow-auto">
            <div className="max-w-2xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                    PandaDoc Not Configured
                  </CardTitle>
                  <CardDescription>
                    Add your PANDADOC_API_KEY in the Secrets tab to enable proposal imports from PandaDoc.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Once configured, you'll be able to:
                  </p>
                  <ul className="list-disc list-inside mt-2 text-sm text-muted-foreground space-y-1">
                    <li>Import all proposals from your PandaDoc account</li>
                    <li>AI extracts pricing, scope, and client data automatically</li>
                    <li>Review and approve to create CPQ quotes</li>
                    <li>Track all imported proposals in one place</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileHeader />
        <main className="flex-1 p-4 md:p-8 overflow-auto">
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-2xl font-bold">Proposal Vault</h1>
                <p className="text-muted-foreground">Import and manage proposals from PandaDoc</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => syncMutation.mutate()}
                  disabled={syncMutation.isPending}
                  data-testid="button-sync-pandadoc"
                >
                  {syncMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Sync from PandaDoc
                </Button>
                {pendingCount > 0 && (
                  <Button 
                    onClick={() => processAllMutation.mutate()}
                    disabled={processAllMutation.isPending}
                    data-testid="button-process-all"
                  >
                    {processAllMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                    Process All ({pendingCount})
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Imported</p>
                      <p className="text-2xl font-bold">{stats?.totalDocuments || 0}</p>
                    </div>
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Pending Processing</p>
                      <p className="text-2xl font-bold">{pendingCount}</p>
                    </div>
                    <Clock className="h-8 w-8 text-amber-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Ready for Review</p>
                      <p className="text-2xl font-bold">{reviewCount}</p>
                    </div>
                    <Eye className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Approved</p>
                      <p className="text-2xl font-bold">{approvedCount}</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="documents" data-testid="tab-documents">
                  Documents ({documents.length})
                </TabsTrigger>
                <TabsTrigger value="review" data-testid="tab-review">
                  Review Queue ({reviewCount})
                </TabsTrigger>
                <TabsTrigger value="batches" data-testid="tab-batches">
                  Import History ({batches.length})
                </TabsTrigger>
              </TabsList>

        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>All Documents</CardTitle>
              <CardDescription>All proposals imported from PandaDoc</CardDescription>
            </CardHeader>
            <CardContent>
              {docsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No documents imported yet</p>
                  <p className="text-sm">Click "Sync from PandaDoc" to import your proposals</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div 
                      key={doc.id} 
                      className="flex items-center justify-between p-3 rounded-lg border hover-elevate cursor-pointer"
                      onClick={() => {
                        if (doc.importStatus === "extracted" || doc.importStatus === "needs_review") {
                          setSelectedDocument(doc);
                          setReviewDialogOpen(true);
                        }
                      }}
                      data-testid={`document-row-${doc.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{doc.pandaDocName || "Untitled"}</p>
                          <p className="text-sm text-muted-foreground">
                            {doc.pandaDocCreatedAt && format(new Date(doc.pandaDocCreatedAt), "MMM d, yyyy")}
                            {doc.cpqQuoteId && (
                              <span className="ml-2 text-green-600">
                                <ArrowRight className="h-3 w-3 inline" /> Quote #{doc.cpqQuoteId}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StageBadge stage={doc.pandaDocStage} />
                        <StatusBadge status={doc.importStatus} />
                        {doc.importStatus === "pending" && (
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              processDocMutation.mutate(doc.id);
                            }}
                            disabled={processDocMutation.isPending}
                            data-testid={`button-process-${doc.id}`}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        {(doc.importStatus === "extracted" || doc.importStatus === "needs_review") && (
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDocument(doc);
                              setReviewDialogOpen(true);
                            }}
                            data-testid={`button-review-${doc.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="review" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Review Queue</CardTitle>
              <CardDescription>Documents ready for review and approval</CardDescription>
            </CardHeader>
            <CardContent>
              {documents.filter(d => d.importStatus === "extracted" || d.importStatus === "needs_review").length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No documents pending review</p>
                  <p className="text-sm">Process pending documents to add them to the review queue</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents
                    .filter(d => d.importStatus === "extracted" || d.importStatus === "needs_review")
                    .map((doc) => {
                      const extracted = doc.extractedData as ExtractedData | null;
                      return (
                        <div 
                          key={doc.id} 
                          className="flex items-center justify-between p-4 rounded-lg border hover-elevate cursor-pointer"
                          onClick={() => {
                            setSelectedDocument(doc);
                            setReviewDialogOpen(true);
                          }}
                          data-testid={`review-row-${doc.id}`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{doc.pandaDocName || "Untitled"}</p>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  {extracted?.clientName && <span>{extracted.clientName}</span>}
                                  {extracted?.totalPrice && (
                                    <span className="text-primary font-medium">
                                      ${extracted.totalPrice.toLocaleString()}
                                    </span>
                                  )}
                                  {extracted?.confidence && (
                                    <Badge variant="outline" className="text-xs">
                                      {extracted.confidence}% confidence
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <StageBadge stage={doc.pandaDocStage} />
                            <Button data-testid={`button-review-queue-${doc.id}`}>
                              Review <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="batches" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Import History</CardTitle>
              <CardDescription>Previous import batches from PandaDoc</CardDescription>
            </CardHeader>
            <CardContent>
              {batchesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : batches.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Download className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No imports yet</p>
                  <p className="text-sm">Start by syncing from PandaDoc</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {batches.map((batch) => (
                    <div 
                      key={batch.id} 
                      className="flex items-center justify-between p-3 rounded-lg border"
                      data-testid={`batch-row-${batch.id}`}
                    >
                      <div>
                        <p className="font-medium">{batch.name || `Batch #${batch.id}`}</p>
                        <p className="text-sm text-muted-foreground">
                          {batch.createdAt && format(new Date(batch.createdAt), "MMM d, yyyy h:mm a")}
                          {" • "}
                          {batch.totalDocuments} documents, {batch.successfulDocuments} successful
                        </p>
                      </div>
                      <StatusBadge status={batch.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

          <DocumentReviewDialog 
            document={selectedDocument}
            open={reviewDialogOpen}
            onOpenChange={setReviewDialogOpen}
          />
          </div>
        </main>
      </div>
    </div>
  );
}
