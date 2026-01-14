import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
    Brain,
    Sparkles,
    RefreshCw,
    Plus,
    Edit,
    Trash2,
    Check,
    X,
    TrendingUp,
    Target,
    Lightbulb,
    Database,
    Zap,
    BarChart3,
    MessageSquare,
    Loader2,
    ChevronRight,
    Copy
} from "lucide-react";

interface AgentPrompt {
    id: number;
    category: string;
    name: string;
    basePrompt: string;
    optimizedPrompt: string;
    variables: string[];
    performance: {
        usageCount: number;
        successRate: number;
        avgConfidence: number;
        lastUsed: string;
    };
    metadata: {
        createdBy: "system" | "user" | "agent";
        version: number;
        optimizationNotes?: string;
    };
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

interface MarketingIntel {
    id: number;
    category: string;
    title: string;
    summary: string;
    insights: string[];
    actionItems: string[];
    confidence: number;
    isActioned: boolean;
    createdAt: string;
}

interface RAGContext {
    brand: {
        personas: Array<{ name: string; identity: string; mantra: string }>;
        redLines: string[];
        standards: Array<{ term: string; definition: string }>;
    };
    capabilities: Array<{ category: string; name: string; description: string }>;
    geography: {
        regions: string[];
        primaryMarkets: string[];
        serviceAreas: string[];
    };
    network: {
        totalLeads: number;
        leadsByRegion: Record<string, number>;
        topBuildingTypes: string[];
        recentWins: Array<{ name: string; type: string; value?: string }>;
    };
    intel: {
        recentOpportunities: number;
        activeCompetitors: string[];
        policyAlerts: number;
    };
}

export default function AgentDashboard() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState("prompts");
    const [newPromptOpen, setNewPromptOpen] = useState(false);
    const [editingPrompt, setEditingPrompt] = useState<AgentPrompt | null>(null);
    const [newPrompt, setNewPrompt] = useState({ category: "", name: "", basePrompt: "" });

    // Fetch prompts
    const { data: prompts, isLoading: promptsLoading } = useQuery<AgentPrompt[]>({
        queryKey: ["/api/agent/prompts"],
    });

    // Fetch marketing intel
    const { data: intelData, isLoading: intelLoading } = useQuery<MarketingIntel[]>({
        queryKey: ["/api/agent/intel"],
    });

    // Fetch RAG context
    const { data: ragContext, isLoading: ragLoading } = useQuery<RAGContext>({
        queryKey: ["/api/agent/context"],
    });

    // Fetch categories
    const { data: categories } = useQuery<Array<{ value: string; label: string }>>({
        queryKey: ["/api/agent/categories"],
    });

    // Generate prompts mutation
    const generateMutation = useMutation({
        mutationFn: async () => {
            const res = await apiRequest("POST", "/api/agent/prompts/generate");
            return res.json();
        },
        onSuccess: (data: any) => {
            toast({ title: "Prompts Generated", description: `Created ${data.stored} new prompts` });
            queryClient.invalidateQueries({ queryKey: ["/api/agent/prompts"] });
        },
        onError: () => {
            toast({ title: "Error", description: "Failed to generate prompts", variant: "destructive" });
        },
    });

    // Add prompt mutation
    const addPromptMutation = useMutation({
        mutationFn: async (data: { category: string; name: string; basePrompt: string }) => {
            const res = await apiRequest("POST", "/api/agent/prompts", data);
            return res.json();
        },
        onSuccess: () => {
            toast({ title: "Prompt Added", description: "Your prompt was optimized and saved" });
            queryClient.invalidateQueries({ queryKey: ["/api/agent/prompts"] });
            setNewPromptOpen(false);
            setNewPrompt({ category: "", name: "", basePrompt: "" });
        },
    });

    // Optimize prompt mutation
    const optimizeMutation = useMutation({
        mutationFn: async ({ id, accepted, userEdits }: { id: number; accepted: boolean; userEdits?: string }) => {
            const res = await apiRequest("POST", `/api/agent/prompts/${id}/optimize`, { accepted, userEdits });
            return res.json();
        },
        onSuccess: () => {
            toast({ title: "Prompt Optimized", description: "The AI improved this prompt" });
            queryClient.invalidateQueries({ queryKey: ["/api/agent/prompts"] });
        },
    });

    // Delete prompt mutation
    const deleteMutation = useMutation({
        mutationFn: (id: number) => apiRequest("DELETE", `/api/agent/prompts/${id}`),
        onSuccess: () => {
            toast({ title: "Prompt Deleted" });
            queryClient.invalidateQueries({ queryKey: ["/api/agent/prompts"] });
        },
    });

    // Extract intel mutation
    const extractMutation = useMutation({
        mutationFn: async () => {
            const res = await apiRequest("POST", "/api/agent/intel/extract");
            return res.json();
        },
        onSuccess: (data: any) => {
            toast({ title: "Intel Extracted", description: `Found ${data.extracted} insights` });
            queryClient.invalidateQueries({ queryKey: ["/api/agent/intel"] });
        },
    });

    // Action intel mutation
    const actionMutation = useMutation({
        mutationFn: (id: number) => apiRequest("POST", `/api/agent/intel/${id}/action`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/agent/intel"] });
        },
    });

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: "Copied to clipboard" });
    };

    const getCategoryColor = (category: string) => {
        const colors: Record<string, string> = {
            opportunity: "bg-green-500/10 text-green-500",
            policy: "bg-blue-500/10 text-blue-500",
            competitor: "bg-red-500/10 text-red-500",
            project: "bg-purple-500/10 text-purple-500",
            technology: "bg-cyan-500/10 text-cyan-500",
            funding: "bg-yellow-500/10 text-yellow-500",
            event: "bg-pink-500/10 text-pink-500",
            talent: "bg-orange-500/10 text-orange-500",
            market: "bg-indigo-500/10 text-indigo-500",
        };
        return colors[category] || "bg-gray-500/10 text-gray-500";
    };

    const getCreatorBadge = (creator: string) => {
        switch (creator) {
            case "agent":
                return <Badge variant="secondary"><Brain className="w-3 h-3 mr-1" />AI</Badge>;
            case "user":
                return <Badge variant="outline">User</Badge>;
            default:
                return <Badge variant="outline">System</Badge>;
        }
    };

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
                <main className="flex-1 p-4 md:p-8 overflow-auto">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <div>
                            <h1 className="text-2xl font-bold flex items-center gap-2">
                                <Brain className="w-7 h-7 text-primary" />
                                AI Agent Dashboard
                            </h1>
                            <p className="text-muted-foreground">
                                Manage prompts, extract insights, and train your marketing intelligence
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => extractMutation.mutate()}
                                disabled={extractMutation.isPending}
                            >
                                {extractMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Lightbulb className="w-4 h-4 mr-2" />
                                )}
                                Extract Intel
                            </Button>
                            <Button
                                onClick={() => generateMutation.mutate()}
                                disabled={generateMutation.isPending}
                            >
                                {generateMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Sparkles className="w-4 h-4 mr-2" />
                                )}
                                Generate Prompts
                            </Button>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Active Prompts</p>
                                        <p className="text-2xl font-bold">
                                            {prompts?.filter(p => p.isActive).length || 0}
                                        </p>
                                    </div>
                                    <MessageSquare className="w-8 h-8 text-primary/20" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Intel Items</p>
                                        <p className="text-2xl font-bold">{intelData?.length || 0}</p>
                                    </div>
                                    <Lightbulb className="w-8 h-8 text-primary/20" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Total Leads</p>
                                        <p className="text-2xl font-bold">{ragContext?.network?.totalLeads || 0}</p>
                                    </div>
                                    <Target className="w-8 h-8 text-primary/20" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Opportunities</p>
                                        <p className="text-2xl font-bold">{ragContext?.intel?.recentOpportunities || 0}</p>
                                    </div>
                                    <TrendingUp className="w-8 h-8 text-primary/20" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main Tabs */}
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="mb-6">
                            <TabsTrigger value="prompts" className="gap-2">
                                <MessageSquare className="w-4 h-4" />
                                Prompt Library
                            </TabsTrigger>
                            <TabsTrigger value="intel" className="gap-2">
                                <Lightbulb className="w-4 h-4" />
                                Marketing Intel
                            </TabsTrigger>
                            <TabsTrigger value="context" className="gap-2">
                                <Database className="w-4 h-4" />
                                RAG Context
                            </TabsTrigger>
                        </TabsList>

                        {/* Prompts Tab */}
                        <TabsContent value="prompts">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-semibold">Prompt Library</h2>
                                <Dialog open={newPromptOpen} onOpenChange={setNewPromptOpen}>
                                    <DialogTrigger asChild>
                                        <Button size="sm">
                                            <Plus className="w-4 h-4 mr-2" />
                                            Add Prompt
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Add New Prompt</DialogTitle>
                                            <DialogDescription>
                                                Submit your prompt idea and the AI will optimize it.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 py-4">
                                            <div>
                                                <Label>Category</Label>
                                                <Select
                                                    value={newPrompt.category}
                                                    onValueChange={(v) => setNewPrompt({ ...newPrompt, category: v })}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select category" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {categories?.map((cat) => (
                                                            <SelectItem key={cat.value} value={cat.value}>
                                                                {cat.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <Label>Name</Label>
                                                <Input
                                                    value={newPrompt.name}
                                                    onChange={(e) => setNewPrompt({ ...newPrompt, name: e.target.value })}
                                                    placeholder="e.g., NYC Historic RFPs"
                                                />
                                            </div>
                                            <div>
                                                <Label>Base Prompt</Label>
                                                <Textarea
                                                    value={newPrompt.basePrompt}
                                                    onChange={(e) => setNewPrompt({ ...newPrompt, basePrompt: e.target.value })}
                                                    placeholder="Enter your search prompt..."
                                                    rows={4}
                                                />
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button variant="outline" onClick={() => setNewPromptOpen(false)}>
                                                Cancel
                                            </Button>
                                            <Button
                                                onClick={() => addPromptMutation.mutate(newPrompt)}
                                                disabled={!newPrompt.category || !newPrompt.name || !newPrompt.basePrompt}
                                            >
                                                {addPromptMutation.isPending ? (
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                ) : (
                                                    <Sparkles className="w-4 h-4 mr-2" />
                                                )}
                                                Add & Optimize
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>

                            {promptsLoading ? (
                                <div className="space-y-4">
                                    {[1, 2, 3].map((i) => (
                                        <Skeleton key={i} className="h-32" />
                                    ))}
                                </div>
                            ) : prompts?.length === 0 ? (
                                <Card>
                                    <CardContent className="py-12 text-center">
                                        <Brain className="w-12 h-12 mx-auto mb-4 text-muted-foreground/20" />
                                        <p className="text-muted-foreground">No prompts yet.</p>
                                        <p className="text-sm text-muted-foreground mt-2">
                                            Click "Generate Prompts" to create AI-optimized prompts for each category.
                                        </p>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="space-y-4">
                                    {prompts?.map((prompt) => (
                                        <Card key={prompt.id}>
                                            <CardHeader className="pb-2">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Badge className={getCategoryColor(prompt.category)}>
                                                            {prompt.category}
                                                        </Badge>
                                                        {getCreatorBadge(prompt.metadata.createdBy)}
                                                        <span className="text-xs text-muted-foreground">
                                                            v{prompt.metadata.version}
                                                        </span>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => copyToClipboard(prompt.optimizedPrompt)}
                                                        >
                                                            <Copy className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => optimizeMutation.mutate({ id: prompt.id, accepted: true })}
                                                            disabled={optimizeMutation.isPending}
                                                        >
                                                            <Check className="w-4 h-4 text-green-500" />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => optimizeMutation.mutate({ id: prompt.id, accepted: false })}
                                                            disabled={optimizeMutation.isPending}
                                                        >
                                                            <RefreshCw className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => deleteMutation.mutate(prompt.id)}
                                                        >
                                                            <Trash2 className="w-4 h-4 text-destructive" />
                                                        </Button>
                                                    </div>
                                                </div>
                                                <CardTitle className="text-base">{prompt.name}</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-3">
                                                    <div>
                                                        <p className="text-xs text-muted-foreground mb-1">Optimized Prompt:</p>
                                                        <p className="text-sm bg-muted/50 p-3 rounded-md font-mono text-xs">
                                                            {prompt.optimizedPrompt}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                        <div className="flex items-center gap-1">
                                                            <Zap className="w-3 h-3" />
                                                            Uses: {prompt.performance.usageCount}
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <BarChart3 className="w-3 h-3" />
                                                            Success: {prompt.performance.successRate}%
                                                        </div>
                                                        {prompt.variables.length > 0 && (
                                                            <div>
                                                                Variables: {prompt.variables.join(", ")}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        {/* Intel Tab */}
                        <TabsContent value="intel">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-semibold">Marketing Intelligence</h2>
                                <Button
                                    size="sm"
                                    onClick={() => extractMutation.mutate()}
                                    disabled={extractMutation.isPending}
                                >
                                    {extractMutation.isPending ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Sparkles className="w-4 h-4 mr-2" />
                                    )}
                                    Extract New Intel
                                </Button>
                            </div>

                            {intelLoading ? (
                                <div className="space-y-4">
                                    {[1, 2, 3].map((i) => (
                                        <Skeleton key={i} className="h-40" />
                                    ))}
                                </div>
                            ) : intelData?.length === 0 ? (
                                <Card>
                                    <CardContent className="py-12 text-center">
                                        <Lightbulb className="w-12 h-12 mx-auto mb-4 text-muted-foreground/20" />
                                        <p className="text-muted-foreground">No marketing intel yet.</p>
                                        <p className="text-sm text-muted-foreground mt-2">
                                            Click "Extract Intel" to analyze news feeds for insights.
                                        </p>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="space-y-4">
                                    {intelData?.map((intel) => (
                                        <Card key={intel.id} className={intel.isActioned ? "opacity-60" : ""}>
                                            <CardHeader className="pb-2">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Badge className={getCategoryColor(intel.category)}>
                                                            {intel.category}
                                                        </Badge>
                                                        <Badge variant="outline">
                                                            {intel.confidence}% confidence
                                                        </Badge>
                                                        {intel.isActioned && (
                                                            <Badge variant="secondary">
                                                                <Check className="w-3 h-3 mr-1" />
                                                                Actioned
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    {!intel.isActioned && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => actionMutation.mutate(intel.id)}
                                                        >
                                                            <Check className="w-4 h-4 mr-2" />
                                                            Mark Done
                                                        </Button>
                                                    )}
                                                </div>
                                                <CardTitle className="text-base">{intel.title}</CardTitle>
                                                <CardDescription>{intel.summary}</CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="grid md:grid-cols-2 gap-4">
                                                    {intel.insights?.length > 0 && (
                                                        <div>
                                                            <p className="text-xs font-medium mb-2">Key Insights:</p>
                                                            <ul className="space-y-1">
                                                                {intel.insights.map((insight, i) => (
                                                                    <li key={i} className="text-sm flex items-start gap-2">
                                                                        <ChevronRight className="w-4 h-4 mt-0.5 text-primary" />
                                                                        {insight}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                    {intel.actionItems?.length > 0 && (
                                                        <div>
                                                            <p className="text-xs font-medium mb-2">Action Items:</p>
                                                            <ul className="space-y-1">
                                                                {intel.actionItems.map((action, i) => (
                                                                    <li key={i} className="text-sm flex items-start gap-2">
                                                                        <Target className="w-4 h-4 mt-0.5 text-green-500" />
                                                                        {action}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        {/* RAG Context Tab */}
                        <TabsContent value="context">
                            <div className="mb-4">
                                <h2 className="text-lg font-semibold">RAG Context</h2>
                                <p className="text-sm text-muted-foreground">
                                    This is the context the AI uses to understand your company
                                </p>
                            </div>

                            {ragLoading ? (
                                <div className="space-y-4">
                                    {[1, 2, 3].map((i) => (
                                        <Skeleton key={i} className="h-40" />
                                    ))}
                                </div>
                            ) : !ragContext ? (
                                <Card>
                                    <CardContent className="py-12 text-center">
                                        <Database className="w-12 h-12 mx-auto mb-4 text-muted-foreground/20" />
                                        <p className="text-muted-foreground">Unable to load RAG context.</p>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="grid md:grid-cols-2 gap-6">
                                    {/* Brand */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <Brain className="w-4 h-4" />
                                                Brand
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div>
                                                <p className="text-xs font-medium mb-2">Personas ({ragContext.brand.personas.length})</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {ragContext.brand.personas.map((p, i) => (
                                                        <Badge key={i} variant="secondary">{p.name}</Badge>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium mb-2">Red Lines ({ragContext.brand.redLines.length})</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {ragContext.brand.redLines.length} rules active
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium mb-2">Standards ({ragContext.brand.standards.length})</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {ragContext.brand.standards.slice(0, 5).map((s, i) => (
                                                        <Badge key={i} variant="outline" className="text-xs">{s.term}</Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Capabilities */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <Zap className="w-4 h-4" />
                                                Capabilities ({ragContext.capabilities.length})
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex flex-wrap gap-2">
                                                {ragContext.capabilities.slice(0, 8).map((c, i) => (
                                                    <Badge key={i} variant="secondary">{c.name}</Badge>
                                                ))}
                                                {ragContext.capabilities.length > 8 && (
                                                    <Badge variant="outline">+{ragContext.capabilities.length - 8} more</Badge>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Geography */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <Target className="w-4 h-4" />
                                                Geography
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div>
                                                <p className="text-xs font-medium mb-2">Regions</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {ragContext.geography.regions.map((r, i) => (
                                                        <Badge key={i} variant="secondary">{r}</Badge>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium mb-2">Primary Markets</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {ragContext.geography.primaryMarkets.map((m, i) => (
                                                        <Badge key={i} variant="outline">{m}</Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Network */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <BarChart3 className="w-4 h-4" />
                                                Network
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Total Leads</p>
                                                    <p className="text-xl font-bold">{ragContext.network.totalLeads}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Recent Wins</p>
                                                    <p className="text-xl font-bold">{ragContext.network.recentWins.length}</p>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium mb-2">Top Building Types</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {ragContext.network.topBuildingTypes.map((t, i) => (
                                                        <Badge key={i} variant="outline" className="text-xs">{t}</Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </main>
            </div>
        </div>
    );
}
