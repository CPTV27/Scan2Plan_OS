import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Send, RefreshCw, ExternalLink, AlertCircle, Eye, Mail, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PandaDocEmbedProps {
  pandaDocId: string | null;
  documentName?: string;
  onDocumentCreated?: (docId: string) => void;
  onDocumentSent?: () => void;
  onOpenSendDialog?: () => void;
  leadId?: number;
  quoteId?: number;
  proposalEmails?: Array<{
    openCount: number;
    sentAt: string;
  }>;
}

interface DocumentStatus {
  id: string;
  name: string;
  status: string;
  date_created: string;
  date_modified: string;
}

export function PandaDocEmbed({ 
  pandaDocId, 
  documentName,
  onDocumentSent,
  onDocumentCreated,
  onOpenSendDialog,
  leadId,
  quoteId,
  proposalEmails,
}: PandaDocEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const [editorLoaded, setEditorLoaded] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [documentStatus, setDocumentStatus] = useState<DocumentStatus | null>(null);
  const [currentDocId, setCurrentDocId] = useState<string | null>(pandaDocId);
  const { toast } = useToast();

  const createDocumentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/pandadoc/documents", {
        quoteId,
        leadId,
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.id) {
        setCurrentDocId(data.id);
        onDocumentCreated?.(data.id);
        toast({
          title: "Document created",
          description: "Your proposal has been created in PandaDoc. You can now edit it.",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Failed to create document",
        description: String(error),
        variant: "destructive",
      });
    },
  });

  const editingSessionMutation = useMutation({
    mutationFn: async (docId: string) => {
      const response = await apiRequest("POST", `/api/pandadoc/documents/${docId}/editing-session`);
      return response.json();
    },
    onSuccess: async (data) => {
      if (data.token && containerRef.current) {
        try {
          const { Editor } = await import("pandadoc-editor");
          
          if (editorRef.current) {
            editorRef.current.close();
          }
          
          editorRef.current = new Editor(containerRef.current.id, {
            width: "100%",
            height: "100%",
            fieldPlacementOnly: false,
            fields: {
              signature: { visible: true },
              text: { visible: true },
              date: { visible: true },
              checkbox: { visible: true },
            },
            blocks: {
              pricingTable: { visible: true },
              quote: { visible: true },
            },
          });
          
          editorRef.current.open({
            token: data.token,
            documentId: activeDocId,
          });
          
          setEditorLoaded(true);
          setEditorError(null);
        } catch (err) {
          console.error("Editor initialization error:", err);
          setEditorError("Failed to initialize the document editor");
        }
      }
    },
    onError: (error) => {
      console.error("Editing session error:", error);
      setEditorError("Failed to create editing session. The embedded editor feature may not be enabled for your PandaDoc account.");
    },
  });

  const sendDocumentMutation = useMutation({
    mutationFn: async (docId: string) => {
      const response = await apiRequest("POST", `/api/pandadoc/documents/${docId}/send`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Document sent",
        description: "The proposal has been sent for signature.",
      });
      onDocumentSent?.();
      refreshStatus();
    },
    onError: (error) => {
      toast({
        title: "Failed to send",
        description: String(error),
        variant: "destructive",
      });
    },
  });

  const activeDocId = currentDocId || pandaDocId;

  const refreshStatus = async () => {
    if (!activeDocId) return;
    try {
      const response = await apiRequest("GET", `/api/pandadoc/documents/${activeDocId}/status`);
      const status = await response.json();
      setDocumentStatus(status);
    } catch (error) {
      console.error("Failed to refresh status:", error);
    }
  };

  useEffect(() => {
    if (activeDocId) {
      refreshStatus();
      editingSessionMutation.mutate(activeDocId);
    }
    
    return () => {
      if (editorRef.current) {
        try {
          editorRef.current.close();
        } catch (e) {
        }
      }
    };
  }, [activeDocId]);

  if (!activeDocId) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent className="text-center py-12">
          <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-medium mb-2">No Proposal Document</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {quoteId 
              ? "Create a PandaDoc proposal from your saved quote to send to the client."
              : "Save a quote in the Quote Builder first, then create a proposal here."
            }
          </p>
          {quoteId && (
            <Button 
              onClick={() => createDocumentMutation.mutate()}
              disabled={createDocumentMutation.isPending}
              data-testid="button-create-proposal"
            >
              {createDocumentMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Create Proposal
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = () => {
    if (!documentStatus) return null;
    const statusColors: Record<string, string> = {
      "document.draft": "bg-yellow-500/10 text-yellow-500",
      "document.sent": "bg-blue-500/10 text-blue-500",
      "document.viewed": "bg-purple-500/10 text-purple-500",
      "document.completed": "bg-green-500/10 text-green-500",
      "document.declined": "bg-red-500/10 text-red-500",
    };
    const colorClass = statusColors[documentStatus.status] || "bg-muted text-muted-foreground";
    const statusLabel = documentStatus.status.replace("document.", "").toUpperCase();
    
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colorClass}`}>
        {statusLabel}
      </span>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5" />
          <span className="font-medium">{documentName || documentStatus?.name || "Proposal"}</span>
          {getStatusBadge()}
          {/* Email Status Badge */}
          {proposalEmails && proposalEmails.length > 0 && (
            proposalEmails[0].openCount > 0 ? (
              <Badge variant="default" className="bg-green-600 text-white text-xs" data-testid="badge-proposal-opened">
                <Eye className="w-3 h-3 mr-1" />
                Viewed {proposalEmails[0].openCount}x
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs" data-testid="badge-proposal-sent">
                <Clock className="w-3 h-3 mr-1" />
                Sent
              </Badge>
            )
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Preview Proposal PDF */}
          {leadId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/api/google/gmail/preview-proposal/${leadId}`, '_blank')}
              data-testid="button-preview-proposal"
            >
              <Eye className="h-4 w-4 mr-1" />
              Preview PDF
            </Button>
          )}
          {/* Send Proposal Email */}
          {onOpenSendDialog && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenSendDialog}
              data-testid="button-send-proposal"
            >
              <Mail className="h-4 w-4 mr-1" />
              Send Email
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshStatus}
            data-testid="button-refresh-status"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(`https://app.pandadoc.com/documents/${activeDocId}`, "_blank")}
            data-testid="button-open-pandadoc"
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            Open in PandaDoc
          </Button>
          {documentStatus?.status === "document.draft" && (
            <Button
              size="sm"
              onClick={() => sendDocumentMutation.mutate(activeDocId!)}
              disabled={sendDocumentMutation.isPending}
              data-testid="button-send-for-signature"
            >
              {sendDocumentMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-1" />
              )}
              Send for Signature
            </Button>
          )}
        </div>
      </div>
      
      <div className="flex-1 relative">
        {editingSessionMutation.isPending && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading editor...</p>
            </div>
          </div>
        )}
        
        {editorError && (
          <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
            <Card className="max-w-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  Editor Unavailable
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{editorError}</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => window.open(`https://app.pandadoc.com/documents/${activeDocId}`, "_blank")}
                    data-testid="button-fallback-open"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Edit in PandaDoc
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setEditorError(null);
                      editingSessionMutation.mutate(activeDocId!);
                    }}
                    data-testid="button-retry-editor"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Retry
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        <div 
          id="pandadoc-editor-container" 
          ref={containerRef} 
          className="h-full w-full"
          style={{ minHeight: "600px" }}
        />
      </div>
    </div>
  );
}
