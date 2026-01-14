/**
 * CI Status Panel
 * 
 * Shows CI/CD status and allows triggering tests from within the app.
 */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
    PlayCircle,
    CheckCircle2,
    XCircle,
    Clock,
    Loader2,
    ExternalLink,
    GitBranch,
    RefreshCw
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface CIRun {
    id: number;
    name: string;
    status: "queued" | "in_progress" | "completed";
    conclusion: "success" | "failure" | "cancelled" | null;
    branch: string;
    createdAt: string;
    updatedAt: string;
    url: string;
    commit: {
        sha: string;
        message: string;
    };
}

interface CIStatusResponse {
    success: boolean;
    configured: boolean;
    runs?: CIRun[];
    error?: string;
}

interface CITriggerResponse {
    success: boolean;
    message: string;
    error?: string;
}

export function CIStatusPanel() {
    const { toast } = useToast();
    const [runE2e, setRunE2e] = useState(true);

    // Fetch CI status
    const { data: status, isLoading, refetch } = useQuery<CIStatusResponse>({
        queryKey: ["/api/ci/status"],
        refetchInterval: 30000, // Auto-refresh every 30 seconds
    });

    // Trigger CI mutation
    const triggerMutation = useMutation({
        mutationFn: async () => {
            const response = await apiRequest("POST", "/api/ci/trigger", { runE2e });
            return response.json();
        },
        onSuccess: (data: CITriggerResponse) => {
            if (data.success) {
                toast({
                    title: "CI Triggered",
                    description: "Tests are running. Check back in a few minutes.",
                });
                // Refetch status after a short delay
                setTimeout(() => refetch(), 5000);
            } else {
                toast({
                    title: "Failed to trigger CI",
                    description: data.error || "Unknown error",
                    variant: "destructive",
                });
            }
        },
        onError: (error: any) => {
            toast({
                title: "Failed to trigger CI",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const getStatusIcon = (run: CIRun) => {
        if (run.status === "in_progress" || run.status === "queued") {
            return <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />;
        }
        if (run.conclusion === "success") {
            return <CheckCircle2 className="h-4 w-4 text-green-500" />;
        }
        if (run.conclusion === "failure") {
            return <XCircle className="h-4 w-4 text-destructive" />;
        }
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    };

    const getStatusBadge = (run: CIRun) => {
        if (run.status === "in_progress") {
            return <Badge variant="outline" className="text-yellow-500 border-yellow-500">Running</Badge>;
        }
        if (run.status === "queued") {
            return <Badge variant="outline">Queued</Badge>;
        }
        if (run.conclusion === "success") {
            return <Badge variant="default" className="bg-green-500">Passed</Badge>;
        }
        if (run.conclusion === "failure") {
            return <Badge variant="destructive">Failed</Badge>;
        }
        if (run.conclusion === "cancelled") {
            return <Badge variant="secondary">Cancelled</Badge>;
        }
        return <Badge variant="secondary">Unknown</Badge>;
    };

    if (!status?.configured) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <GitBranch className="h-5 w-5" />
                        Continuous Integration
                    </CardTitle>
                    <CardDescription>Run automated tests on demand</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-sm text-muted-foreground space-y-2">
                        <p>GitHub integration is not configured.</p>
                        <p className="text-xs">
                            To enable in-app CI triggers, add <code className="bg-muted px-1 rounded">GITHUB_TOKEN</code> to your environment variables.
                            Create a Personal Access Token with <code className="bg-muted px-1 rounded">repo</code> and <code className="bg-muted px-1 rounded">workflow</code> scopes.
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <GitBranch className="h-5 w-5" />
                    Continuous Integration
                </CardTitle>
                <CardDescription>Run automated tests and view recent runs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Trigger Section */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Switch
                                id="run-e2e"
                                checked={runE2e}
                                onCheckedChange={setRunE2e}
                            />
                            <Label htmlFor="run-e2e">Include E2E Tests</Label>
                        </div>
                    </div>

                    <Button
                        onClick={() => triggerMutation.mutate()}
                        disabled={triggerMutation.isPending}
                        className="w-full"
                        data-testid="button-trigger-ci"
                    >
                        {triggerMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                            <PlayCircle className="h-4 w-4 mr-2" />
                        )}
                        Run Tests Now
                    </Button>
                </div>

                <Separator />

                {/* Recent Runs */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">Recent Runs</h4>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => refetch()}
                            disabled={isLoading}
                        >
                            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : status?.runs && status.runs.length > 0 ? (
                        <div className="space-y-2">
                            {status.runs.slice(0, 5).map((run) => (
                                <div
                                    key={run.id}
                                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm"
                                >
                                    <div className="flex items-center gap-2">
                                        {getStatusIcon(run)}
                                        <div className="flex flex-col">
                                            <span className="font-medium truncate max-w-[200px]">
                                                {run.commit?.message || run.name}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {run.commit?.sha && `${run.commit.sha} • `}
                                                {formatDistanceToNow(new Date(run.createdAt), { addSuffix: true })}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {getStatusBadge(run)}
                                        <a
                                            href={run.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-muted-foreground hover:text-foreground"
                                        >
                                            <ExternalLink className="h-3 w-3" />
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            No recent CI runs
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
