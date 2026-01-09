import { Sidebar, MobileHeader } from "@/components/Sidebar";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Copy, Check, Linkedin, Twitter, Instagram, Mail,
  Megaphone, BarChart3, MessageSquare, Sparkles, Clock,
  ChevronRight, Trash2, Edit2, Eye, Plus, Star, ExternalLink, Lightbulb
} from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import type { MarketingPost, EvidenceVaultEntry } from "@shared/schema";

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  linkedin: <Linkedin className="h-4 w-4" />,
  twitter: <Twitter className="h-4 w-4" />,
  instagram: <Instagram className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
};

const CATEGORY_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  stat_bomb: { label: "Stat Bomb", variant: "destructive" },
  process_tease: { label: "Process Tease", variant: "secondary" },
  case_highlight: { label: "Case Highlight", variant: "default" },
  thought_leadership: { label: "Thought Leadership", variant: "outline" },
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  approved: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  posted: "bg-green-500/10 text-green-600 dark:text-green-400",
};

export default function Marketing() {
  const [activeTab, setActiveTab] = useState("queue");

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
        <MobileHeader />
        <main className="flex-1 p-4 md:p-8 overflow-auto">
          <header className="mb-6">
            <h2 className="text-3xl font-display font-bold" data-testid="text-marketing-title">Marketing</h2>
            <p className="text-muted-foreground mt-1">Truth Loop content queue and campaign management.</p>
          </header>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid gap-1" data-testid="marketing-tabs">
              <TabsTrigger value="queue" data-testid="tab-queue">
                <Megaphone className="h-4 w-4 mr-2" />
                Content Queue
              </TabsTrigger>
              <TabsTrigger value="posted" data-testid="tab-posted">
                <Check className="h-4 w-4 mr-2" />
                Posted
              </TabsTrigger>
              <TabsTrigger value="evidence" data-testid="tab-evidence">
                <Sparkles className="h-4 w-4 mr-2" />
                Evidence Vault
              </TabsTrigger>
            </TabsList>

            <TabsContent value="queue" className="space-y-6">
              <ContentQueue status="draft" title="Draft Content" />
              <ContentQueue status="approved" title="Approved - Ready to Post" />
            </TabsContent>

            <TabsContent value="posted" className="space-y-6">
              <ContentQueue status="posted" title="Posted Content" />
            </TabsContent>

            <TabsContent value="evidence" className="space-y-6">
              <EvidenceVaultSection />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}

function ContentQueue({ status, title }: { status: string; title: string }) {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const { data: posts, isLoading } = useQuery<MarketingPost[]>({
    queryKey: ['/api/marketing-posts', status],
    queryFn: async () => {
      const res = await fetch(`/api/marketing-posts?status=${status}`);
      if (!res.ok) throw new Error('Failed to fetch posts');
      return res.json();
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest('PATCH', `/api/marketing-posts/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketing-posts'] });
      toast({ title: "Status updated", description: "Post status has been changed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update post status.", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/marketing-posts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketing-posts'] });
      toast({ title: "Deleted", description: "Post has been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete post.", variant: "destructive" });
    }
  });

  const copyToClipboard = async (content: string, id: number) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    toast({ title: "Copied!", description: "Content copied to clipboard." });
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Megaphone className="h-12 w-12 mb-4 opacity-50" />
            <p>No {status} content available</p>
            <p className="text-sm mt-1">Content will appear here when generated by the Truth Loop</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <Badge variant="secondary">{posts.length} posts</Badge>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        {posts.map((post) => (
          <Card key={post.id} data-testid={`card-post-${post.id}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {PLATFORM_ICONS[post.platform || 'linkedin']}
                  {post.category && CATEGORY_BADGES[post.category] && (
                    <Badge variant={CATEGORY_BADGES[post.category].variant}>
                      {CATEGORY_BADGES[post.category].label}
                    </Badge>
                  )}
                  <Badge className={STATUS_COLORS[post.status || 'draft']}>
                    {post.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  {post.variancePercent && (
                    <Badge variant="outline" className="text-xs">
                      <BarChart3 className="h-3 w-3 mr-1" />
                      {post.variancePercent}%
                    </Badge>
                  )}
                </div>
              </div>
              {post.suggestedVisual && (
                <CardDescription className="flex items-center gap-1 mt-2">
                  <Eye className="h-3 w-3" />
                  {post.suggestedVisual}
                </CardDescription>
              )}
            </CardHeader>
            
            <CardContent>
              <div className="bg-muted/50 rounded-md p-3 text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
                {post.content}
              </div>
              
              {post.savingsAmount && Number(post.savingsAmount) > 0 && (
                <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Potential savings highlighted:</span>
                  <Badge variant="outline" className="text-green-600 dark:text-green-400">
                    ${Number(post.savingsAmount).toLocaleString()}
                  </Badge>
                </div>
              )}
            </CardContent>
            
            <CardFooter className="flex flex-wrap gap-2 pt-3 border-t">
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(post.content || '', post.id)}
                data-testid={`button-copy-${post.id}`}
              >
                {copiedId === post.id ? (
                  <><Check className="h-4 w-4 mr-1" /> Copied</>
                ) : (
                  <><Copy className="h-4 w-4 mr-1" /> Copy</>
                )}
              </Button>
              
              {status === 'draft' && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => updateMutation.mutate({ id: post.id, status: 'approved' })}
                  disabled={updateMutation.isPending}
                  data-testid={`button-approve-${post.id}`}
                >
                  <Check className="h-4 w-4 mr-1" /> Approve
                </Button>
              )}
              
              {status === 'approved' && (
                <Button
                  size="sm"
                  onClick={() => updateMutation.mutate({ id: post.id, status: 'posted' })}
                  disabled={updateMutation.isPending}
                  data-testid={`button-posted-${post.id}`}
                >
                  <Megaphone className="h-4 w-4 mr-1" /> Mark Posted
                </Button>
              )}
              
              {status !== 'posted' && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto text-destructive"
                  onClick={() => deleteMutation.mutate(post.id)}
                  disabled={deleteMutation.isPending}
                  data-testid={`button-delete-${post.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              
              {post.createdAt && (
                <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(post.createdAt), 'MMM d, yyyy')}
                </span>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

const PERSONA_OPTIONS = [
  { code: "BP1", label: "The Engineer" },
  { code: "BP2", label: "The GC" },
  { code: "BP3", label: "The Owner's Rep" },
  { code: "BP4", label: "The Facilities Manager" },
  { code: "BP5", label: "The Architect" },
  { code: "BP6", label: "The Developer" },
  { code: "BP7", label: "The Surveyor" },
  { code: "BP8", label: "The Influencer / Tech Leader" },
];

const PERSONA_LABELS: Record<string, string> = {
  BP1: "The Engineer",
  BP2: "The GC",
  BP3: "The Owner's Rep",
  BP4: "The Facilities Manager",
  BP5: "The Architect",
  BP6: "The Developer",
  BP7: "The Surveyor",
  BP8: "The Influencer / Tech Leader",
};

function EWSStars({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-4 w-4 ${
            s <= score
              ? 'fill-amber-400 text-amber-400'
              : 'text-muted-foreground/30'
          }`}
        />
      ))}
    </div>
  );
}

function EvidenceVaultSection() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<EvidenceVaultEntry | null>(null);
  const [formData, setFormData] = useState({
    personaCode: "",
    hookContent: "",
    ewsScore: 3,
    sourceUrl: "",
  });

  const { data: entries, isLoading } = useQuery<EvidenceVaultEntry[]>({
    queryKey: ['/api/evidence-vault'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest('POST', '/api/evidence-vault', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/evidence-vault'] });
      toast({ title: "Hook added", description: "Evidence vault entry created." });
      resetForm();
      setDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create hook.", variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof formData }) => {
      return apiRequest('PATCH', `/api/evidence-vault/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/evidence-vault'] });
      toast({ title: "Hook updated", description: "Evidence vault entry updated." });
      resetForm();
      setDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update hook.", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/evidence-vault/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/evidence-vault'] });
      toast({ title: "Deleted", description: "Hook has been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete hook.", variant: "destructive" });
    }
  });

  const resetForm = () => {
    setFormData({ personaCode: "", hookContent: "", ewsScore: 3, sourceUrl: "" });
    setEditingEntry(null);
  };

  const openAddDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (entry: EvidenceVaultEntry) => {
    setEditingEntry(entry);
    setFormData({
      personaCode: entry.personaCode || "",
      hookContent: entry.hookContent || "",
      ewsScore: entry.ewsScore || 3,
      sourceUrl: entry.sourceUrl || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.personaCode || !formData.hookContent) {
      toast({ title: "Validation error", description: "Persona and hook content are required.", variant: "destructive" });
      return;
    }
    if (editingEntry) {
      updateMutation.mutate({ id: editingEntry.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const truncateText = (text: string, maxLen: number) => {
    if (!text) return "";
    return text.length > maxLen ? text.substring(0, maxLen) + "..." : text;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-6 space-y-4">
        <Card className="bg-muted/50 border-blue-200 dark:border-blue-800" data-testid="card-evidence-vault-howto">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <CardTitle className="text-lg text-blue-900 dark:text-blue-100">How the Evidence Vault Works</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-slate-700 dark:text-slate-300 space-y-2">
            <p>
              This is the <strong>"Ammo Dump"</strong> for your Growth Engine. The system reads from this list to write your sales emails automatically.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Input:</strong> Add your best "Hero Stats" here (e.g., <em>"Saved $40k in rework"</em>).
              </li>
              <li>
                <strong>Tag:</strong> Assign a Persona (e.g., <em>The Architect</em>) and an EWS Score (1-5 stars).
              </li>
              <li>
                <strong>Automate:</strong> When you click "Sync to GoHighLevel," the engine automatically grabs the <strong>highest-rated hook</strong> for that lead's persona.
              </li>
            </ul>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 italic">
              *Tip: Higher EWS scores (4-5) will be prioritized in outreach scripts.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold">Evidence Vault</h3>
          <p className="text-sm text-muted-foreground">High-converting hooks mined from archives, organized by buyer persona.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog} data-testid="button-add-hook">
              <Plus className="h-4 w-4 mr-2" />
              Add Hook
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingEntry ? "Edit Hook" : "Add New Hook"}</DialogTitle>
              <DialogDescription>
                {editingEntry ? "Update the evidence vault entry." : "Add a high-EWS hook for persona-based outreach."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="persona">Persona</Label>
                <Select
                  value={formData.personaCode}
                  onValueChange={(val) => setFormData({ ...formData, personaCode: val })}
                >
                  <SelectTrigger data-testid="select-persona">
                    <SelectValue placeholder="Select buyer persona..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PERSONA_OPTIONS.map((p) => (
                      <SelectItem key={p.code} value={p.code}>
                        {p.code} - {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hookContent">Hook Content</Label>
                <Textarea
                  id="hookContent"
                  placeholder="Enter the script snippet or pain point hook..."
                  value={formData.hookContent}
                  onChange={(e) => setFormData({ ...formData, hookContent: e.target.value })}
                  rows={4}
                  data-testid="input-hook-content"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ewsScore">EWS Score (Emotional Weight Score)</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="ewsScore"
                    type="number"
                    min={1}
                    max={5}
                    value={formData.ewsScore}
                    onChange={(e) => setFormData({ ...formData, ewsScore: Math.min(5, Math.max(1, parseInt(e.target.value) || 1)) })}
                    className="w-20"
                    data-testid="input-ews-score"
                  />
                  <EWSStars score={formData.ewsScore} />
                </div>
                <p className="text-xs text-muted-foreground">1 = Low emotional impact, 5 = High emotional impact</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sourceUrl">Source URL (Optional)</Label>
                <Input
                  id="sourceUrl"
                  type="url"
                  placeholder="https://linkedin.com/post/..."
                  value={formData.sourceUrl}
                  onChange={(e) => setFormData({ ...formData, sourceUrl: e.target.value })}
                  data-testid="input-source-url"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleSubmit} 
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-save-hook"
              >
                {editingEntry ? "Update" : "Add Hook"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {!entries || entries.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Sparkles className="h-12 w-12 mb-4 opacity-50" />
            <p>No evidence vault entries yet</p>
            <p className="text-sm mt-1">Click "Add Hook" to populate with high-converting scripts</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[45%]">Hook Content</TableHead>
                  <TableHead className="w-[15%]">Persona</TableHead>
                  <TableHead className="w-[15%]">EWS Score</TableHead>
                  <TableHead className="w-[10%] text-center">Uses</TableHead>
                  <TableHead className="w-[15%] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id} data-testid={`row-hook-${entry.id}`}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm">{truncateText(entry.hookContent || "", 80)}</span>
                        {entry.sourceUrl && (
                          <a
                            href={entry.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Source
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" data-testid={`badge-persona-${entry.id}`}>
                        {entry.personaCode}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <EWSStars score={entry.ewsScore || 0} />
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{entry.usageCount || 0}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditDialog(entry)}
                          data-testid={`button-edit-${entry.id}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => deleteMutation.mutate(entry.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-${entry.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
