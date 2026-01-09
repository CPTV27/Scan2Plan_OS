import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, RefreshCw, Download, CheckCircle, XCircle, Users, Briefcase, Building2 } from "lucide-react";
import { SiHubspot } from "react-icons/si";

interface HubSpotStatus {
  connected: boolean;
  message: string;
  contactCount?: number;
  dealCount?: number;
  companyCount?: number;
}

interface HubSpotDeal {
  id: string;
  properties: {
    dealname?: string;
    amount?: string;
    dealstage?: string;
    closedate?: string;
  };
}

interface ImportResult {
  imported: number;
  total: number;
  errors: string[];
  message: string;
}

export function HubSpotImport() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const statusQuery = useQuery<HubSpotStatus>({
    queryKey: ["/api/hubspot/status"],
    enabled: open,
    refetchOnWindowFocus: false,
  });

  const dealsQuery = useQuery<HubSpotDeal[]>({
    queryKey: ["/api/hubspot/deals"],
    enabled: open && statusQuery.data?.connected,
    refetchOnWindowFocus: false,
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/hubspot/import");
      return res.json() as Promise<ImportResult>;
    },
    onSuccess: (data) => {
      toast({
        title: "Import Complete",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      if (data.errors.length > 0) {
        console.warn("HubSpot import errors:", data.errors);
      }
    },
    onError: (err: any) => {
      toast({
        title: "Import Failed",
        description: err.message || "Failed to import deals from HubSpot",
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (value: string | undefined) => {
    if (!value) return "$0";
    const num = parseFloat(value);
    if (isNaN(num)) return "$0";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const mapStage = (stage: string | undefined): string => {
    if (!stage) return "Unknown";
    const stageMap: Record<string, string> = {
      appointmentscheduled: "Contacted",
      qualifiedtobuy: "Proposal",
      presentationscheduled: "Proposal",
      decisionmakerboughtin: "Negotiation",
      contractsent: "Negotiation",
      closedwon: "Closed Won",
      closedlost: "Closed Lost",
    };
    return stageMap[stage.toLowerCase()] || stage;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid="button-hubspot-import">
          <SiHubspot className="w-4 h-4 mr-2" />
          Import from HubSpot
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SiHubspot className="w-5 h-5 text-[#ff7a59]" />
            HubSpot CRM Import
          </DialogTitle>
          <DialogDescription>
            Import contacts and deals from HubSpot into Scan2Plan leads
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {statusQuery.isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Connecting to HubSpot...</span>
            </div>
          )}

          {statusQuery.data && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  {statusQuery.data.connected ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-destructive" />
                  )}
                  Connection Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">{statusQuery.data.message}</p>
                {statusQuery.data.connected && (
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{statusQuery.data.contactCount ?? 0} Contacts</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{statusQuery.data.dealCount ?? 0} Deals</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{statusQuery.data.companyCount ?? 0} Companies</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {statusQuery.data?.connected && dealsQuery.isLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading deals...</span>
            </div>
          )}

          {statusQuery.data?.connected && dealsQuery.data && (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Available Deals ({dealsQuery.data.length})</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => dealsQuery.refetch()}
                  disabled={dealsQuery.isRefetching}
                  data-testid="button-refresh-deals"
                >
                  <RefreshCw className={`w-4 h-4 ${dealsQuery.isRefetching ? "animate-spin" : ""}`} />
                </Button>
              </div>

              <ScrollArea className="h-[300px] border rounded-md">
                <div className="p-2 space-y-2">
                  {dealsQuery.data.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No deals found in HubSpot
                    </p>
                  ) : (
                    dealsQuery.data.map((deal) => (
                      <div
                        key={deal.id}
                        className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                        data-testid={`hubspot-deal-${deal.id}`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">
                            {deal.properties.dealname || "Untitled Deal"}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {mapStage(deal.properties.dealstage)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatCurrency(deal.properties.amount)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  data-testid="button-cancel-import"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => importMutation.mutate()}
                  disabled={importMutation.isPending || dealsQuery.data.length === 0}
                  data-testid="button-import-deals"
                >
                  {importMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Import {dealsQuery.data.length} Deals
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {!statusQuery.data?.connected && !statusQuery.isLoading && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-4">
                HubSpot is not connected. Please set up the HubSpot integration first.
              </p>
              <Button variant="outline" onClick={() => statusQuery.refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry Connection
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
