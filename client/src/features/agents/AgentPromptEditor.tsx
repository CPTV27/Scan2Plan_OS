/**
 * Agent Prompt Editor
 * 
 * CEO-only interface to view and edit AI agent system prompts,
 * with visual pipeline diagram and test capabilities.
 */

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Brain,
    Search,
    BarChart3,
    Target,
    Edit,
    Shield,
    Play,
    Save,
    RotateCcw,
    CheckCircle,
    AlertCircle,
    Loader2,
    Database,
    Rss,
    FileOutput,
} from "lucide-react";
import { Sidebar } from "@/components/Sidebar";

interface AgentConfig {
    name: string;
    displayName: string;
    provider: string;
    model: string;
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
    defaultPrompt?: string;
    isCustomized: boolean;
    updatedAt?: string;
    updatedBy?: string;
}

interface PipelineNode {
    id: string;
    label: string;
    type: "source" | "agent" | "output";
}

interface PipelineEdge {
    from: string;
    to: string;
    label: string;
}

const agentIcons: Record<string, React.ReactNode> = {
    scout: <Search className="w-5 h-5" />,
    analyst: <BarChart3 className="w-5 h-5" />,
    strategist: <Target className="w-5 h-5" />,
    composer: <Edit className="w-5 h-5" />,
    auditor: <Shield className="w-5 h-5" />,
};

const agentColors: Record<string, string> = {
    scout: "bg-blue-500",
    analyst: "bg-purple-500",
    strategist: "bg-orange-500",
    composer: "bg-green-500",
    auditor: "bg-red-500",
};

export function AgentPromptEditor() {
    const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
    const [editedPrompt, setEditedPrompt] = useState("");
    const [testInput, setTestInput] = useState("");
    const [testResult, setTestResult] = useState<any>(null);
    const [showTestDialog, setShowTestDialog] = useState(false);

    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Fetch all agent configs
    const { data: configsData, isLoading } = useQuery<any>({
        queryKey: ["/api/agent/configs"],
        select: (response) => response?.data || response,
    });

    const agents = configsData?.agents || [];
    const pipelineFlow = configsData?.pipelineFlow;

    // Update prompt mutation
    const updateMutation = useMutation({
        mutationFn: async ({ agent, systemPrompt }: { agent: string; systemPrompt: string }) => {
            const res = await apiRequest("PUT", `/api/agent/configs/${agent}`, { systemPrompt });
            return res.json();
        },
        onSuccess: (data) => {
            toast({
                title: "Prompt Updated",
                description: data.message,
            });
            queryClient.invalidateQueries({ queryKey: ["/api/agent/configs"] });
            setSelectedAgent(null);
        },
        onError: () => {
            toast({
                title: "Error",
                description: "Failed to update prompt",
                variant: "destructive",
            });
        },
    });

    // Reset prompt mutation
    const resetMutation = useMutation({
        mutationFn: async (agent: string) => {
            const res = await apiRequest("POST", `/api/agent/configs/${agent}/reset`);
            return res.json();
        },
        onSuccess: (data) => {
            toast({
                title: "Prompt Reset",
                description: data.message,
            });
            queryClient.invalidateQueries({ queryKey: ["/api/agent/configs"] });
        },
    });

    // Test agent mutation
    const testMutation = useMutation({
        mutationFn: async ({ agent, testInput }: { agent: string; testInput: string }) => {
            const res = await apiRequest("POST", `/api/agent/configs/${agent}/test`, { testInput });
            return res.json();
        },
        onSuccess: (data) => {
            setTestResult(data);
        },
        onError: (error: any) => {
            setTestResult({ error: error.message || "Test failed" });
        },
    });

    const handleEditAgent = (agent: AgentConfig) => {
        setSelectedAgent(agent.name);
        setEditedPrompt(agent.systemPrompt);
    };

    const handleSavePrompt = () => {
        if (selectedAgent && editedPrompt) {
            updateMutation.mutate({ agent: selectedAgent, systemPrompt: editedPrompt });
        }
    };

    const handleTestAgent = (agentName: string) => {
        setShowTestDialog(true);
        setTestResult(null);
        setTestInput("");
        setSelectedAgent(agentName);
    };

    const runTest = () => {
        if (selectedAgent && testInput) {
            testMutation.mutate({ agent: selectedAgent, testInput });
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
                <main className="flex-1 p-4 md:p-8 overflow-auto">
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold flex items-center gap-2">
                                    <Brain className="w-6 h-6 text-primary" />
                                    Agent Prompt Editor
                                </h2>
                                <p className="text-muted-foreground">
                                    Configure AI agent behavior by editing their system prompts
                                </p>
                            </div>
                        </div>

                        {/* Visual Pipeline Diagram */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg">Pipeline Flow</CardTitle>
                                <CardDescription>
                                    Click an agent to edit its prompt
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-center gap-2 flex-wrap py-4">
                                    {/* Data Sources */}
                                    <div className="flex flex-col gap-2 items-center">
                                        <div className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center gap-2 text-sm">
                                            <Rss className="w-4 h-4" />
                                            RSS Feeds
                                        </div>
                                        <div className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center gap-2 text-sm">
                                            <Database className="w-4 h-4" />
                                            PostgreSQL
                                        </div>
                                    </div>

                                    <div className="text-2xl text-muted-foreground">→</div>

                                    {/* Agent Pipeline */}
                                    {["scout", "analyst", "strategist", "composer", "auditor"].map((agentName, idx) => {
                                        const agent = agents.find((a: AgentConfig) => a.name === agentName);
                                        if (!agent) return null;

                                        return (
                                            <React.Fragment key={agentName}>
                                                <button
                                                    onClick={() => handleEditAgent(agent)}
                                                    className={`
                                            px-4 py-3 rounded-xl text-white font-medium
                                            flex flex-col items-center gap-1 min-w-[90px]
                                            transition-all hover:scale-105 hover:shadow-lg
                                            ${agentColors[agentName]}
                                            ${agent.isCustomized ? "ring-2 ring-yellow-400" : ""}
                                        `}
                                                >
                                                    {agentIcons[agentName]}
                                                    <span className="text-xs capitalize">{agentName}</span>
                                                    {agent.isCustomized && (
                                                        <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                                            Custom
                                                        </Badge>
                                                    )}
                                                </button>
                                                {idx < 4 && (
                                                    <div className="text-xl text-muted-foreground">→</div>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}

                                    <div className="text-2xl text-muted-foreground">→</div>

                                    {/* Output */}
                                    <div className="px-3 py-2 rounded-lg bg-green-100 dark:bg-green-900 flex items-center gap-2 text-sm text-green-800 dark:text-green-200">
                                        <FileOutput className="w-4 h-4" />
                                        Output
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Agent Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {agents.map((agent: AgentConfig) => (
                                <Card key={agent.name} className={selectedAgent === agent.name ? "ring-2 ring-primary" : ""}>
                                    <CardHeader className="pb-2">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <span className={`p-2 rounded-lg text-white ${agentColors[agent.name]}`}>
                                                    {agentIcons[agent.name]}
                                                </span>
                                                <span className="capitalize">{agent.name}</span>
                                            </CardTitle>
                                            <div className="flex gap-1">
                                                <Badge variant="outline">{agent.model}</Badge>
                                                {agent.isCustomized && (
                                                    <Badge variant="secondary">Custom</Badge>
                                                )}
                                            </div>
                                        </div>
                                        <CardDescription className="text-xs">
                                            {agent.provider} • temp: {agent.temperature} • max: {agent.maxTokens} tokens
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="text-sm text-muted-foreground line-clamp-3">
                                            {agent.systemPrompt.substring(0, 150)}...
                                        </div>

                                        {agent.updatedAt && (
                                            <p className="text-xs text-muted-foreground">
                                                Last edited: {new Date(agent.updatedAt).toLocaleDateString()}
                                                {agent.updatedBy && ` by ${agent.updatedBy}`}
                                            </p>
                                        )}

                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                onClick={() => handleEditAgent(agent)}
                                            >
                                                <Edit className="w-3 h-3 mr-1" />
                                                Edit
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleTestAgent(agent.name)}
                                            >
                                                <Play className="w-3 h-3 mr-1" />
                                                Test
                                            </Button>
                                            {agent.isCustomized && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => resetMutation.mutate(agent.name)}
                                                    disabled={resetMutation.isPending}
                                                >
                                                    <RotateCcw className="w-3 h-3" />
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Edit Prompt Dialog */}
                        <Dialog open={!!selectedAgent && !showTestDialog} onOpenChange={() => setSelectedAgent(null)}>
                            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                        {selectedAgent && agentIcons[selectedAgent]}
                                        Edit {selectedAgent && selectedAgent.charAt(0).toUpperCase() + selectedAgent.slice(1)} Agent Prompt
                                    </DialogTitle>
                                    <DialogDescription>
                                        Modify the system instructions that guide this agent's behavior.
                                        Changes take effect immediately.
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium mb-2 block">
                                            System Prompt
                                        </label>
                                        <Textarea
                                            value={editedPrompt}
                                            onChange={(e) => setEditedPrompt(e.target.value)}
                                            className="min-h-[300px] font-mono text-sm"
                                            placeholder="Enter the system prompt..."
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {editedPrompt.length} characters
                                        </p>
                                    </div>

                                    <div className="flex justify-end gap-2">
                                        <Button variant="outline" onClick={() => setSelectedAgent(null)}>
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={handleSavePrompt}
                                            disabled={updateMutation.isPending}
                                        >
                                            {updateMutation.isPending ? (
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            ) : (
                                                <Save className="w-4 h-4 mr-2" />
                                            )}
                                            Save Changes
                                        </Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>

                        {/* Test Agent Dialog */}
                        <Dialog open={showTestDialog} onOpenChange={() => { setShowTestDialog(false); setTestResult(null); }}>
                            <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                        <Play className="w-5 h-5" />
                                        Test {selectedAgent && selectedAgent.charAt(0).toUpperCase() + selectedAgent.slice(1)} Agent
                                    </DialogTitle>
                                    <DialogDescription>
                                        Run the agent with sample input to see how it responds.
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium mb-2 block">
                                            Sample Input
                                        </label>
                                        <Textarea
                                            value={testInput}
                                            onChange={(e) => setTestInput(e.target.value)}
                                            className="min-h-[100px]"
                                            placeholder="Enter test content for the agent to process..."
                                        />
                                    </div>

                                    <Button
                                        onClick={runTest}
                                        disabled={testMutation.isPending || !testInput.trim()}
                                        className="w-full"
                                    >
                                        {testMutation.isPending ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Running...
                                            </>
                                        ) : (
                                            <>
                                                <Play className="w-4 h-4 mr-2" />
                                                Run Test
                                            </>
                                        )}
                                    </Button>

                                    {testResult && (
                                        <div className="mt-4 p-4 rounded-lg bg-muted">
                                            <div className="flex items-center gap-2 mb-2">
                                                {testResult.success ? (
                                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                                ) : (
                                                    <AlertCircle className="w-5 h-5 text-red-500" />
                                                )}
                                                <span className="font-medium">
                                                    {testResult.success ? "Success" : "Error"}
                                                </span>
                                                {testResult.durationMs && (
                                                    <Badge variant="outline">{testResult.durationMs}ms</Badge>
                                                )}
                                            </div>

                                            {testResult.error ? (
                                                <p className="text-red-500 text-sm">{testResult.error}</p>
                                            ) : (
                                                <pre className="text-xs overflow-auto max-h-[200px] p-2 bg-background rounded">
                                                    {JSON.stringify(testResult.output, null, 2)}
                                                </pre>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </main>
            </div>
        </div>
    );
}

export default AgentPromptEditor;

