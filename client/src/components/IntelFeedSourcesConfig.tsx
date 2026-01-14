import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Rss, Globe, Webhook, Plus, Trash2, RefreshCw, CheckCircle, XCircle, Loader2, Settings2 } from "lucide-react";

interface IntelFeedSource {
  id: number;
  name: string;
  type: "bidnet_api" | "rss" | "webhook";
  config: {
    apiKey?: string;
    apiUrl?: string;
    feedUrl?: string;
    webhookSecret?: string;
    filters?: Record<string, string>;
    syncIntervalMinutes?: number;
  };
  isActive: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: "success" | "error" | null;
  lastSyncError: string | null;
  createdAt: string;
}

const sourceTypeIcons = {
  bidnet_api: Globe,
  rss: Rss,
  webhook: Webhook,
};

const sourceTypeLabels = {
  bidnet_api: "BidNet API",
  rss: "RSS Feed",
  webhook: "Webhook",
};

export function IntelFeedSourcesConfig() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newSource, setNewSource] = useState({
    name: "",
    type: "rss" as "bidnet_api" | "rss" | "webhook",
    config: {} as Record<string, string>,
  });

  const { data: sources = [], isLoading } = useQuery<IntelFeedSource[]>({
    queryKey: ["/api/intel-sources"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newSource) => {
      const response = await apiRequest("POST", "/api/intel-sources", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/intel-sources"] });
      setIsAddDialogOpen(false);
      setNewSource({ name: "", type: "rss", config: {} });
      toast({ title: "Feed source added" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add source", description: error.message, variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const response = await apiRequest("PUT", `/api/intel-sources/${id}`, { isActive });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/intel-sources"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/intel-sources/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/intel-sources"] });
      toast({ title: "Feed source deleted" });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/intel-sources/${id}/sync`);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/intel-sources"] });
      toast({ title: "Sync complete", description: `Imported ${data.itemsImported || 0} items` });
    },
    onError: (error: Error) => {
      toast({ title: "Sync failed", description: error.message, variant: "destructive" });
    },
  });

  const testMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/intel-sources/${id}/test`);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Connection successful", description: data.message });
      } else {
        toast({ title: "Connection failed", description: data.message, variant: "destructive" });
      }
    },
  });

  const handleAddSource = () => {
    if (!newSource.name) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    createMutation.mutate(newSource);
  };

  const renderConfigFields = () => {
    switch (newSource.type) {
      case "bidnet_api":
        return (
          <>
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                type="password"
                placeholder="Enter your BidNet API key"
                value={newSource.config.apiKey || ""}
                onChange={(e) => setNewSource(prev => ({
                  ...prev,
                  config: { ...prev.config, apiKey: e.target.value }
                }))}
                data-testid="input-bidnet-api-key"
              />
            </div>
            <div className="space-y-2">
              <Label>API URL (optional)</Label>
              <Input
                placeholder="https://api.bidnet.com/v1"
                value={newSource.config.apiUrl || ""}
                onChange={(e) => setNewSource(prev => ({
                  ...prev,
                  config: { ...prev.config, apiUrl: e.target.value }
                }))}
                data-testid="input-bidnet-api-url"
              />
            </div>
          </>
        );
      case "rss":
        return (
          <div className="space-y-2">
            <Label>Feed URL</Label>
            <Input
              placeholder="https://example.gov/bids.rss"
              value={newSource.config.feedUrl || ""}
              onChange={(e) => setNewSource(prev => ({
                ...prev,
                config: { ...prev.config, feedUrl: e.target.value }
              }))}
              data-testid="input-rss-feed-url"
            />
            <p className="text-xs text-muted-foreground">
              Enter the URL of an RSS or Atom feed for bidding opportunities
            </p>
          </div>
        );
      case "webhook":
        return (
          <div className="space-y-2">
            <Label>Webhook Secret (optional)</Label>
            <Input
              type="password"
              placeholder="Shared secret for request validation"
              value={newSource.config.webhookSecret || ""}
              onChange={(e) => setNewSource(prev => ({
                ...prev,
                config: { ...prev.config, webhookSecret: e.target.value }
              }))}
              data-testid="input-webhook-secret"
            />
            <p className="text-xs text-muted-foreground">
              Webhook endpoint will be: <code className="bg-muted px-1 rounded">/api/intel-feeds/webhook</code>
            </p>
          </div>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="h-5 w-5" />
          Intel Feed Sources
        </CardTitle>
        <CardDescription>Configure BidNet API, RSS feeds, and webhooks for business intelligence</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : sources.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Rss className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No feed sources configured</p>
            <p className="text-xs mt-1">Add BidNet API, RSS feeds, or webhooks to receive intel</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sources.map((source) => {
              const Icon = sourceTypeIcons[source.type];
              return (
                <div
                  key={source.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  data-testid={`intel-source-${source.id}`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{source.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {sourceTypeLabels[source.type]}
                        </Badge>
                        {source.lastSyncStatus === "success" && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                        {source.lastSyncStatus === "error" && (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      {source.lastSyncAt && (
                        <p className="text-xs text-muted-foreground">
                          Last sync: {new Date(source.lastSyncAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={source.isActive}
                      onCheckedChange={(checked) => toggleMutation.mutate({ id: source.id, isActive: checked })}
                      data-testid={`switch-source-active-${source.id}`}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => testMutation.mutate(source.id)}
                      disabled={testMutation.isPending}
                      data-testid={`button-test-source-${source.id}`}
                    >
                      {testMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => syncMutation.mutate(source.id)}
                      disabled={syncMutation.isPending || !source.isActive}
                      data-testid={`button-sync-source-${source.id}`}
                    >
                      {syncMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(source.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-source-${source.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full" variant="outline" data-testid="button-add-intel-source">
              <Plus className="h-4 w-4 mr-2" />
              Add Feed Source
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Intel Feed Source</DialogTitle>
              <DialogDescription>
                Configure a new source for business intelligence data
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Source Name</Label>
                <Input
                  placeholder="e.g., Government Bids RSS"
                  value={newSource.name}
                  onChange={(e) => setNewSource(prev => ({ ...prev, name: e.target.value }))}
                  data-testid="input-source-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Source Type</Label>
                <Select
                  value={newSource.type}
                  onValueChange={(value: "bidnet_api" | "rss" | "webhook") => 
                    setNewSource(prev => ({ ...prev, type: value, config: {} }))
                  }
                >
                  <SelectTrigger data-testid="select-source-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bidnet_api">BidNet API</SelectItem>
                    <SelectItem value="rss">RSS Feed</SelectItem>
                    <SelectItem value="webhook">Webhook</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {renderConfigFields()}
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAddSource}
                  disabled={createMutation.isPending}
                  data-testid="button-save-intel-source"
                >
                  {createMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Add Source
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
