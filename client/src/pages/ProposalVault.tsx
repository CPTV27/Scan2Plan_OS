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
import { useToast } from "@/hooks/use-toast";
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
  ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import type { PandaDocDocument, PandaDocImportBatch } from "@shared/schema";

interface ExtractedData {
  projectName?: string;
  clientName?: string;
  projectAddress?: string;
  totalPrice?: number;
  currency?: string;
  areas?: Array<{ name: string; sqft?: number; buildingType?: string; price?: number }>;
  services?: Array<{ name: string; description?: string; price?: number; quantity?: number }>;
  contacts?: Array<{ name: string; email: string; company?: string }>;
  variables?: Record<string, string>;
  confidence: number;
  unmappedFields?: string[];
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

  const extracted = document?.extractedData as ExtractedData | null;

  if (document && document.id !== lastDocId) {
    setEditedData({});
    setReviewNotes("");
    setLastDocId(document.id);
  }

  const approveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(
        "POST",
        `/api/pandadoc/documents/${document?.id}/approve`,
        { editedData: Object.keys(editedData).length ? editedData : undefined, reviewNotes }
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

  if (!document || !extracted) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Review: {document.pandaDocName}
          </DialogTitle>
          <DialogDescription>
            Review the AI-extracted data before creating a CPQ quote. Confidence: {extracted.confidence}%
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground">Extracted Data</h4>
            
            <div className="space-y-3">
              <div>
                <Label>Project Name</Label>
                <Input 
                  value={editedData.projectName ?? extracted.projectName ?? ""} 
                  onChange={(e) => setEditedData(prev => ({ ...prev, projectName: e.target.value }))}
                  data-testid="input-project-name"
                />
              </div>
              
              <div>
                <Label>Client Name</Label>
                <Input 
                  value={editedData.clientName ?? extracted.clientName ?? ""} 
                  onChange={(e) => setEditedData(prev => ({ ...prev, clientName: e.target.value }))}
                  data-testid="input-client-name"
                />
              </div>
              
              <div>
                <Label>Project Address</Label>
                <Input 
                  value={editedData.projectAddress ?? extracted.projectAddress ?? ""} 
                  onChange={(e) => setEditedData(prev => ({ ...prev, projectAddress: e.target.value }))}
                  data-testid="input-project-address"
                />
              </div>
              
              <div>
                <Label>Total Price</Label>
                <Input 
                  type="number"
                  value={editedData.totalPrice ?? extracted.totalPrice ?? ""} 
                  onChange={(e) => setEditedData(prev => ({ ...prev, totalPrice: parseFloat(e.target.value) }))}
                  data-testid="input-total-price"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground">Services & Pricing</h4>
            
            {extracted.services && extracted.services.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {extracted.services.map((service, i) => (
                  <div key={i} className="p-2 rounded border text-sm">
                    <div className="font-medium">{service.name}</div>
                    {service.description && <div className="text-muted-foreground text-xs">{service.description}</div>}
                    {service.price && <div className="text-primary">${service.price.toLocaleString()}</div>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No services extracted</p>
            )}

            <h4 className="font-medium text-sm text-muted-foreground mt-4">Contacts</h4>
            {extracted.contacts && extracted.contacts.length > 0 ? (
              <div className="space-y-2">
                {extracted.contacts.map((contact, i) => (
                  <div key={i} className="text-sm">
                    <div className="font-medium">{contact.name}</div>
                    <div className="text-muted-foreground">{contact.email}</div>
                    {contact.company && <div className="text-xs">{contact.company}</div>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No contacts extracted</p>
            )}

            {extracted.unmappedFields && extracted.unmappedFields.length > 0 && (
              <>
                <h4 className="font-medium text-sm text-muted-foreground mt-4">Unmapped Fields</h4>
                <div className="text-xs text-amber-600 space-y-1">
                  {extracted.unmappedFields.map((field, i) => (
                    <div key={i}>{field}</div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-4">
          <Label>Review Notes</Label>
          <Textarea 
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder="Add any notes about this review..."
            data-testid="input-review-notes"
          />
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={() => rejectMutation.mutate()}
            disabled={rejectMutation.isPending}
            data-testid="button-reject-document"
          >
            {rejectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
            Reject
          </Button>
          <Button 
            onClick={() => approveMutation.mutate()}
            disabled={approveMutation.isPending}
            data-testid="button-approve-document"
          >
            {approveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
            Approve & Create Quote
          </Button>
        </DialogFooter>
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
      <div className="p-6 max-w-2xl mx-auto">
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
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
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

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
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
            <div className="flex items-center justify-between">
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
            <div className="flex items-center justify-between">
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
            <div className="flex items-center justify-between">
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
                          <Button data-testid={`button-review-queue-${doc.id}`}>
                            Review <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
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
  );
}
