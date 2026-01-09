import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Sidebar, MobileHeader } from "@/components/Sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Sun, Moon, Plus, X, Check, AlertTriangle, 
  Database, Link2, Brain, MapPin, Loader2, Save, RefreshCw, DollarSign
} from "lucide-react";
import type { LeadSourcesConfig, StalenessConfig, BusinessDefaultsConfig } from "@shared/schema";

interface IntegrationStatus {
  airtable: { configured: boolean; writeEnabled: boolean };
  cpq: { configured: boolean; baseUrl: string };
  openai: { configured: boolean };
}

interface QuickBooksStatus {
  configured: boolean;
  connected: boolean;
  redirectUri?: string;
  error?: string;
}

interface QBAccount {
  id: string;
  name: string;
  type: string;
  balance?: number;
}

interface QBAccountsResponse {
  bankAccounts: QBAccount[];
  creditCardAccounts: QBAccount[];
  allAccounts: QBAccount[];
}

interface FinancialMapping {
  operatingAccountId: string | null;
  taxAccountId: string | null;
  expenseAccountId: string | null;
}

export default function Settings() {
  const { toast } = useToast();
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    // Check if dark class is already on the document (set by inline script in HTML)
    if (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) {
      return 'dark';
    }
    const stored = localStorage.getItem("theme") as "light" | "dark" | null;
    return stored || 'dark';
  });

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  // Fetch all settings
  const { data: settings, isLoading } = useQuery<Record<string, unknown>>({
    queryKey: ["/api/settings"],
  });

  // Fetch integration status
  const { data: integrations } = useQuery<IntegrationStatus>({
    queryKey: ["/api/integrations/status"],
  });

  // Fetch QuickBooks status
  const { data: qbStatus, refetch: refetchQB } = useQuery<QuickBooksStatus>({
    queryKey: ["/api/quickbooks/status"],
  });

  // QuickBooks connect mutation
  const qbConnectMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", "/api/quickbooks/auth");
      const data = await response.json();
      return data.authUrl;
    },
    onSuccess: (authUrl: string) => {
      window.location.href = authUrl;
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to connect QuickBooks", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // QuickBooks disconnect mutation
  const qbDisconnectMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/quickbooks/disconnect");
    },
    onSuccess: () => {
      refetchQB();
      toast({ title: "QuickBooks disconnected" });
    },
  });

  // QuickBooks sync mutation
  const qbSyncMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/quickbooks/sync");
      return response.json();
    },
    onSuccess: (data: { synced: number; errors: string[] }) => {
      toast({ 
        title: "Expenses synced", 
        description: `${data.synced} expenses synced from QuickBooks` 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Sync failed", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const leadSources = (settings?.leadSources as LeadSourcesConfig) || { sources: [] };
  const staleness = (settings?.staleness as StalenessConfig) || { warningDays: 7, criticalDays: 14, penaltyPercent: 5 };
  const businessDefaults = (settings?.businessDefaults as BusinessDefaultsConfig) || { 
    defaultTravelRate: 4, 
    dispatchLocations: [], 
    defaultBimDeliverable: "Revit",
    defaultBimVersion: ""
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <MobileHeader />
        <div className="p-4 md:p-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-settings-title">Settings</h1>
            <p className="text-muted-foreground">Configure your CEO HUB preferences</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Theme Toggle */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                  Appearance
                </CardTitle>
                <CardDescription>Customize the look and feel</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="theme-toggle">Dark Mode</Label>
                    <p className="text-sm text-muted-foreground">Toggle between light and dark themes</p>
                  </div>
                  <Switch 
                    id="theme-toggle"
                    checked={theme === "dark"}
                    onCheckedChange={toggleTheme}
                    data-testid="switch-theme-toggle"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Integration Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="h-5 w-5" />
                  Integrations
                </CardTitle>
                <CardDescription>Connection status for external services</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <IntegrationRow 
                  name="Airtable"
                  icon={<Database className="h-4 w-4" />}
                  connected={integrations?.airtable.configured ?? false}
                  details={integrations?.airtable.writeEnabled ? "Read/Write" : "Read Only"}
                />
                <IntegrationRow 
                  name="CPQ Tool"
                  icon={<Link2 className="h-4 w-4" />}
                  connected={integrations?.cpq.configured ?? false}
                  details={integrations?.cpq.baseUrl}
                />
                <IntegrationRow 
                  name="OpenAI (Scoping AI)"
                  icon={<Brain className="h-4 w-4" />}
                  connected={integrations?.openai.configured ?? false}
                />
              </CardContent>
            </Card>

            {/* QuickBooks Integration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  QuickBooks Online
                </CardTitle>
                <CardDescription>Sync expenses for profitability tracking</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">Connection Status</p>
                    <p className="text-xs text-muted-foreground">
                      {qbStatus?.connected 
                        ? "Connected - expenses will sync automatically" 
                        : qbStatus?.configured 
                          ? "Credentials configured, click Connect to authorize"
                          : "Add QUICKBOOKS_CLIENT_ID, QUICKBOOKS_CLIENT_SECRET, and QUICKBOOKS_REDIRECT_URI to secrets"}
                    </p>
                    {qbStatus?.error && (
                      <p className="text-xs text-destructive mt-1">{qbStatus.error}</p>
                    )}
                    {qbStatus?.redirectUri && !qbStatus?.connected && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Redirect URI: {qbStatus.redirectUri}
                      </p>
                    )}
                  </div>
                  <Badge variant={qbStatus?.connected ? "default" : "secondary"}>
                    {qbStatus?.connected ? "Connected" : qbStatus?.configured ? "Ready" : "Not Configured"}
                  </Badge>
                </div>
                
                <Separator />
                
                <div className="flex flex-wrap gap-2">
                  {qbStatus?.connected ? (
                    <>
                      <Button 
                        size="sm"
                        onClick={() => qbSyncMutation.mutate()}
                        disabled={qbSyncMutation.isPending}
                        data-testid="button-qb-sync"
                      >
                        {qbSyncMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Sync Expenses
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => qbDisconnectMutation.mutate()}
                        disabled={qbDisconnectMutation.isPending}
                        data-testid="button-qb-disconnect"
                      >
                        Disconnect
                      </Button>
                    </>
                  ) : qbStatus?.configured ? (
                    <Button 
                      size="sm"
                      onClick={() => qbConnectMutation.mutate()}
                      disabled={qbConnectMutation.isPending}
                      data-testid="button-qb-connect"
                    >
                      {qbConnectMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Link2 className="h-4 w-4 mr-2" />
                      )}
                      Connect QuickBooks
                    </Button>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Please add the QuickBooks credentials to secrets to enable connection.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Financial Mapping - Profit First */}
            {qbStatus?.connected && <FinancialMappingEditor />}

            {/* Lead Sources */}
            <LeadSourcesEditor sources={leadSources.sources} />

            {/* Staleness Configuration */}
            <StalenessEditor config={staleness} />

            {/* Business Defaults */}
            <BusinessDefaultsEditor config={businessDefaults} />
          </div>
        </div>
      </main>
    </div>
  );
}

function IntegrationRow({ 
  name, 
  icon, 
  connected, 
  details 
}: { 
  name: string; 
  icon: React.ReactNode; 
  connected: boolean; 
  details?: string;
}) {
  return (
    <div className="flex items-center justify-between" data-testid={`integration-${name.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-medium">{name}</span>
      </div>
      <div className="flex items-center gap-2">
        {details && <span className="text-xs text-muted-foreground">{details}</span>}
        <Badge variant={connected ? "default" : "secondary"} className="text-xs">
          {connected ? "Connected" : "Not Configured"}
        </Badge>
      </div>
    </div>
  );
}

function FinancialMappingEditor() {
  const { toast } = useToast();
  
  // Fetch QBO accounts
  const { data: accounts, isLoading: accountsLoading } = useQuery<QBAccountsResponse>({
    queryKey: ["/api/quickbooks/accounts"],
  });

  // Fetch current mapping
  const { data: mapping, isLoading: mappingLoading } = useQuery<FinancialMapping>({
    queryKey: ["/api/settings/financial-mapping"],
  });

  const [localMapping, setLocalMapping] = useState<FinancialMapping>({
    operatingAccountId: null,
    taxAccountId: null,
    expenseAccountId: null,
  });

  useEffect(() => {
    if (mapping) {
      setLocalMapping(mapping);
    }
  }, [mapping]);

  const saveMutation = useMutation({
    mutationFn: async (newMapping: FinancialMapping) => {
      return apiRequest("POST", "/api/settings/financial-mapping", newMapping);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/financial-mapping"] });
      toast({ title: "Financial mapping saved" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to save mapping", description: error.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    saveMutation.mutate(localMapping);
  };

  const isLoading = accountsLoading || mappingLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Profit First Mapping
        </CardTitle>
        <CardDescription>Map QuickBooks accounts for financial dashboard</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label>Operating Account (Bank)</Label>
              <select
                className="w-full p-2 rounded-md border bg-background text-foreground"
                value={localMapping.operatingAccountId || ""}
                onChange={(e) => setLocalMapping(prev => ({ ...prev, operatingAccountId: e.target.value || null }))}
                data-testid="select-operating-account"
              >
                <option value="">Select operating account...</option>
                {accounts?.bankAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} {acc.balance !== undefined ? `($${acc.balance.toLocaleString()})` : ""}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">Your main operating/checking account</p>
            </div>

            <div className="space-y-2">
              <Label>Tax Reserve Account (Bank)</Label>
              <select
                className="w-full p-2 rounded-md border bg-background text-foreground"
                value={localMapping.taxAccountId || ""}
                onChange={(e) => setLocalMapping(prev => ({ ...prev, taxAccountId: e.target.value || null }))}
                data-testid="select-tax-account"
              >
                <option value="">Select tax reserve account...</option>
                {accounts?.bankAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} {acc.balance !== undefined ? `($${acc.balance.toLocaleString()})` : ""}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">Account where you hold tax reserves</p>
            </div>

            <div className="space-y-2">
              <Label>Expenses Account (Credit Card)</Label>
              <select
                className="w-full p-2 rounded-md border bg-background text-foreground"
                value={localMapping.expenseAccountId || ""}
                onChange={(e) => setLocalMapping(prev => ({ ...prev, expenseAccountId: e.target.value || null }))}
                data-testid="select-expense-account"
              >
                <option value="">Select expense account...</option>
                {accounts?.creditCardAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} {acc.balance !== undefined ? `($${acc.balance.toLocaleString()})` : ""}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">Primary credit card for business expenses</p>
            </div>

            <Separator />

            <Button 
              onClick={handleSave} 
              disabled={saveMutation.isPending}
              data-testid="button-save-financial-mapping"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Mapping
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function LeadSourcesEditor({ sources }: { sources: string[] }) {
  const { toast } = useToast();
  const [localSources, setLocalSources] = useState(sources);
  const [newSource, setNewSource] = useState("");

  useEffect(() => {
    setLocalSources(sources);
  }, [sources]);

  const mutation = useMutation({
    mutationFn: async (newSources: string[]) => {
      return apiRequest("PUT", "/api/settings/leadSources", { value: { sources: newSources } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Lead sources updated" });
    },
    onError: () => {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  });

  const addSource = () => {
    if (newSource.trim() && !localSources.includes(newSource.trim())) {
      const updated = [...localSources, newSource.trim()];
      setLocalSources(updated);
      setNewSource("");
      mutation.mutate(updated);
    }
  };

  const removeSource = (source: string) => {
    const updated = localSources.filter(s => s !== source);
    setLocalSources(updated);
    mutation.mutate(updated);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Lead Sources
        </CardTitle>
        <CardDescription>Customize where your leads come from</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {localSources.map((source) => (
            <Badge 
              key={source} 
              variant="outline" 
              className="flex items-center gap-1 pr-1"
              data-testid={`badge-source-${source.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {source}
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-4 w-4 p-0 no-default-hover-elevate"
                onClick={() => removeSource(source)}
                data-testid={`button-remove-source-${source.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input 
            placeholder="Add new source..."
            value={newSource}
            onChange={(e) => setNewSource(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addSource()}
            data-testid="input-new-source"
          />
          <Button 
            size="icon" 
            onClick={addSource}
            disabled={!newSource.trim() || mutation.isPending}
            data-testid="button-add-source"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function StalenessEditor({ config }: { config: StalenessConfig }) {
  const { toast } = useToast();
  const [localConfig, setLocalConfig] = useState(config);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const mutation = useMutation({
    mutationFn: async (newConfig: StalenessConfig) => {
      return apiRequest("PUT", "/api/settings/staleness", { value: newConfig });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Staleness settings updated" });
    },
    onError: () => {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  });

  const save = () => mutation.mutate(localConfig);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Staleness Thresholds
        </CardTitle>
        <CardDescription>Configure when leads are marked as stale</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="warning-days">Warning After (days)</Label>
            <Input 
              id="warning-days"
              type="number"
              value={localConfig.warningDays}
              onChange={(e) => setLocalConfig({ ...localConfig, warningDays: parseInt(e.target.value) || 0 })}
              data-testid="input-warning-days"
            />
            <p className="text-xs text-muted-foreground">Leads show yellow warning after this many days without contact</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="critical-days">Critical After (days)</Label>
            <Input 
              id="critical-days"
              type="number"
              value={localConfig.criticalDays}
              onChange={(e) => setLocalConfig({ ...localConfig, criticalDays: parseInt(e.target.value) || 0 })}
              data-testid="input-critical-days"
            />
            <p className="text-xs text-muted-foreground">Leads show red critical status after this many days</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="penalty-percent">Probability Penalty (%/day)</Label>
            <Input 
              id="penalty-percent"
              type="number"
              value={localConfig.penaltyPercent}
              onChange={(e) => setLocalConfig({ ...localConfig, penaltyPercent: parseInt(e.target.value) || 0 })}
              data-testid="input-penalty-percent"
            />
            <p className="text-xs text-muted-foreground">Reduce win probability by this % each day after warning</p>
          </div>
        </div>
        <Button 
          onClick={save} 
          disabled={mutation.isPending}
          className="w-full"
          data-testid="button-save-staleness"
        >
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save Staleness Settings
        </Button>
      </CardContent>
    </Card>
  );
}

function BusinessDefaultsEditor({ config }: { config: BusinessDefaultsConfig }) {
  const { toast } = useToast();
  const [localConfig, setLocalConfig] = useState(config);
  const [newLocation, setNewLocation] = useState("");

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const mutation = useMutation({
    mutationFn: async (newConfig: BusinessDefaultsConfig) => {
      return apiRequest("PUT", "/api/settings/businessDefaults", { value: newConfig });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Business defaults updated" });
    },
    onError: () => {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  });

  const addLocation = () => {
    if (newLocation.trim() && !localConfig.dispatchLocations.includes(newLocation.trim())) {
      setLocalConfig({
        ...localConfig,
        dispatchLocations: [...localConfig.dispatchLocations, newLocation.trim()]
      });
      setNewLocation("");
    }
  };

  const removeLocation = (location: string) => {
    setLocalConfig({
      ...localConfig,
      dispatchLocations: localConfig.dispatchLocations.filter(l => l !== location)
    });
  };

  const save = () => mutation.mutate(localConfig);

  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Business Defaults
        </CardTitle>
        <CardDescription>Default values for new deals and quotes</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="travel-rate">Default Travel Rate ($/mile)</Label>
              <Input 
                id="travel-rate"
                type="number"
                step="0.01"
                value={localConfig.defaultTravelRate}
                onChange={(e) => setLocalConfig({ ...localConfig, defaultTravelRate: parseFloat(e.target.value) || 0 })}
                data-testid="input-travel-rate"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bim-deliverable">Default BIM Deliverable</Label>
              <Input 
                id="bim-deliverable"
                value={localConfig.defaultBimDeliverable}
                onChange={(e) => setLocalConfig({ ...localConfig, defaultBimDeliverable: e.target.value })}
                placeholder="e.g., Revit"
                data-testid="input-bim-deliverable"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bim-version">Default BIM Version/Template</Label>
              <Input 
                id="bim-version"
                value={localConfig.defaultBimVersion}
                onChange={(e) => setLocalConfig({ ...localConfig, defaultBimVersion: e.target.value })}
                placeholder="e.g., 2024"
                data-testid="input-bim-version"
              />
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Dispatch Locations</Label>
              <div className="flex flex-wrap gap-2 min-h-[40px]">
                {localConfig.dispatchLocations.map((location) => (
                  <Badge 
                    key={location} 
                    variant="outline" 
                    className="flex items-center gap-1 pr-1"
                    data-testid={`badge-location-${location.toLowerCase().replace(/[,\s]+/g, '-')}`}
                  >
                    {location}
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-4 w-4 p-0 no-default-hover-elevate"
                      onClick={() => removeLocation(location)}
                      data-testid={`button-remove-location-${location.toLowerCase().replace(/[,\s]+/g, '-')}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input 
                  placeholder="Add location (e.g., Brooklyn, NY)"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addLocation()}
                  data-testid="input-new-location"
                />
                <Button 
                  size="icon" 
                  onClick={addLocation}
                  disabled={!newLocation.trim()}
                  data-testid="button-add-location"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
        <Separator className="my-6" />
        <Button 
          onClick={save} 
          disabled={mutation.isPending}
          className="w-full"
          data-testid="button-save-defaults"
        >
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save Business Defaults
        </Button>
      </CardContent>
    </Card>
  );
}
