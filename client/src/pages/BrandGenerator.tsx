import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Loader2, Sparkles, ShieldCheck, AlertTriangle, Clock, BookOpen, Copy, CheckCircle2, Users, FileText, History, Settings, Target, Shield, Megaphone, Building2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ProposalGenerator, NegotiationConsole, MarketingGenerator } from "@/components/intelligence";
import { Sidebar, MobileHeader } from "@/components/Sidebar";
import type { Lead } from "@shared/schema";

type BuyerType = "BP1" | "BP2" | "BP3" | "BP4" | "BP5" | "BP6" | "BP7" | "BP8";
type PainPoint = "Rework_RFI" | "ScheduleVolatility" | "Inconsistency" | "Terms_Risk";
type AuthorMode = "Twain" | "Fuller";

interface ViolationResult {
  category: string;
  rule: string;
  correction: string;
}

interface GenerationResult {
  finalOutput: string;
  initialDraft: string;
  violationCount: number;
  violationsFound: ViolationResult[];
  rewriteAttempts: number;
  processingTimeMs: number;
}

interface AuditLog {
  id: number;
  promptContext: string;
  buyerType: string;
  painPoint: string;
  violationCount: number;
  rewriteAttempts: number;
  processingTimeMs: number;
  createdAt: string;
}

interface StandardDefinition {
  id: number;
  term: string;
  definition: string;
  guaranteeText: string | null;
  category: string;
}

interface RedLine {
  id: number;
  ruleContent: string;
  violationCategory: string;
  severity: number;
}

const BUYER_TYPE_OPTIONS: { value: BuyerType; label: string; description: string }[] = [
  { value: "BP1", label: "The Engineer", description: "Technical detail-focused, wants accuracy and methodology" },
  { value: "BP2", label: "The GC / Contractor", description: "Schedule and coordination-driven, values speed and reliability" },
  { value: "BP3", label: "The Owner's Rep", description: "Risk management focused, needs defensibility and documentation" },
  { value: "BP4", label: "The PM", description: "Process-oriented, values efficiency and clear deliverables" },
  { value: "BP5", label: "The Architect", description: "Design vision focused, cares about accuracy for design development" },
  { value: "BP6", label: "The Developer / Owner", description: "ROI and investment-focused, values cost certainty and schedule" },
  { value: "BP7", label: "The Sustainability Lead", description: "Energy and compliance focused, needs data for certifications" },
  { value: "BP8", label: "The Tech Leader / Influencer", description: "Innovation-focused, interested in digital twin and tech capabilities" },
];

const PAIN_POINT_OPTIONS: { value: PainPoint; label: string; icon: string }[] = [
  { value: "Rework_RFI", label: "Rework & RFI Reduction", icon: "Building assumptions become field conflicts" },
  { value: "ScheduleVolatility", label: "Schedule Volatility", icon: "Unpredictable timelines and coordination delays" },
  { value: "Inconsistency", label: "Delivery Inconsistency", icon: "Quality varies across projects and teams" },
  { value: "Terms_Risk", label: "Terms & Liability Risk", icon: "Unclear deliverables and change control" },
];

const AUTHOR_MODE_OPTIONS: { value: AuthorMode; label: string; description: string }[] = [
  { value: "Twain", label: "Twain Mode", description: "Concise, short sentences, stripped of adjectives" },
  { value: "Fuller", label: "Fuller Mode", description: "Systems thinking, infrastructure framing" },
];

function buildProjectContext(lead: Lead): string {
  const parts: string[] = [];
  
  if (lead.projectName) parts.push(`Project: ${lead.projectName}`);
  if (lead.clientName) parts.push(`Client: ${lead.clientName}`);
  if (lead.projectAddress) parts.push(`Location: ${lead.projectAddress}`);
  if (lead.buildingType) parts.push(`Building Type: ${lead.buildingType}`);
  if (lead.sqft) parts.push(`Size: ${lead.sqft.toLocaleString()} sqft`);
  if (lead.scope) parts.push(`Scope: ${lead.scope}`);
  if (lead.disciplines) {
    const disciplines = Array.isArray(lead.disciplines) ? lead.disciplines : [lead.disciplines];
    if (disciplines.length > 0) {
      parts.push(`Disciplines: ${disciplines.join(", ")}`);
    }
  }
  if (lead.notes) parts.push(`Notes: ${lead.notes}`);
  
  return parts.join("\n");
}

export default function BrandGenerator() {
  const { toast } = useToast();
  const [buyerType, setBuyerType] = useState<BuyerType>("BP5");
  const [painPoint, setPainPoint] = useState<PainPoint>("Rework_RFI");
  const [authorMode, setAuthorMode] = useState<AuthorMode>("Twain");
  const [selectedLeadId, setSelectedLeadId] = useState<string>("");
  const [projectContext, setProjectContext] = useState("");
  const [generatedContent, setGeneratedContent] = useState<GenerationResult | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: leads } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const { data: auditLogs, isLoading: logsLoading } = useQuery<{ success: boolean; data: AuditLog[] }>({
    queryKey: ["/api/brand/audit-logs"],
  });

  const handleProjectSelect = (leadId: string) => {
    setSelectedLeadId(leadId);
    if (leadId && leads) {
      const selected = leads.find(l => l.id.toString() === leadId);
      if (selected) {
        setProjectContext(buildProjectContext(selected));
        if (selected.buyerPersona) {
          const personaMap: Record<string, BuyerType> = {
            "Design Principal": "BP5",
            "Project Architect": "BP3",
            "Owner Rep": "BP3",
            "GC/CM": "BP2",
          };
          const mappedPersona = personaMap[selected.buyerPersona];
          if (mappedPersona) setBuyerType(mappedPersona);
        }
      }
    }
  };

  const { data: standards } = useQuery<{ success: boolean; data: StandardDefinition[] }>({
    queryKey: ["/api/brand/standards"],
  });

  const { data: redLines } = useQuery<{ success: boolean; data: RedLine[] }>({
    queryKey: ["/api/brand/red-lines"],
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/brand/generate/executive-brief", {
        buyerType,
        painPoint,
        projectContext,
        authorMode,
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setGeneratedContent(data.data);
        queryClient.invalidateQueries({ queryKey: ["/api/brand/audit-logs"] });
        toast({
          title: "Content Generated",
          description: `${data.data.rewriteAttempts > 0 ? `Self-corrected ${data.data.rewriteAttempts} times. ` : ""}Ready for review.`,
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCopy = () => {
    if (generatedContent?.finalOutput) {
      navigator.clipboard.writeText(generatedContent.finalOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
        <MobileHeader />
        <main className="flex-1 overflow-auto">
          <div className="flex h-full">
            <Tabs defaultValue="generate" className="flex flex-1" orientation="vertical">
        <div className="w-56 border-r bg-muted/30 flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">Brand Engine</h2>
                <p className="text-xs text-muted-foreground">AI Writing Assistant</p>
              </div>
            </div>
          </div>
          <TabsList className="flex flex-col h-auto bg-transparent p-2 gap-1">
            <TabsTrigger 
              value="generate" 
              data-testid="tab-generate"
              className="w-full justify-start gap-2 px-3 py-2 data-[state=active]:bg-background"
            >
              <Sparkles className="h-4 w-4" />
              Generate
            </TabsTrigger>
            <TabsTrigger 
              value="personas" 
              data-testid="tab-personas"
              className="w-full justify-start gap-2 px-3 py-2 data-[state=active]:bg-background"
            >
              <Users className="h-4 w-4" />
              Buyer Personas
            </TabsTrigger>
            <TabsTrigger 
              value="standards" 
              data-testid="tab-standards"
              className="w-full justify-start gap-2 px-3 py-2 data-[state=active]:bg-background"
            >
              <FileText className="h-4 w-4" />
              Standards
            </TabsTrigger>
            <TabsTrigger 
              value="governance" 
              data-testid="tab-governance"
              className="w-full justify-start gap-2 px-3 py-2 data-[state=active]:bg-background"
            >
              <ShieldCheck className="h-4 w-4" />
              Governance
            </TabsTrigger>
            <TabsTrigger 
              value="audit" 
              data-testid="tab-audit"
              className="w-full justify-start gap-2 px-3 py-2 data-[state=active]:bg-background"
            >
              <History className="h-4 w-4" />
              Audit Log
            </TabsTrigger>
            <Separator className="my-2" />
            <div className="px-2 py-1">
              <span className="text-xs font-medium text-muted-foreground">Intelligence Engine</span>
            </div>
            <TabsTrigger 
              value="proposals" 
              data-testid="tab-proposals"
              className="w-full justify-start gap-2 px-3 py-2 data-[state=active]:bg-background"
            >
              <Target className="h-4 w-4" />
              Proposals
            </TabsTrigger>
            <TabsTrigger 
              value="negotiation" 
              data-testid="tab-negotiation"
              className="w-full justify-start gap-2 px-3 py-2 data-[state=active]:bg-background"
            >
              <Shield className="h-4 w-4" />
              Negotiation
            </TabsTrigger>
            <TabsTrigger 
              value="marketing" 
              data-testid="tab-marketing"
              className="w-full justify-start gap-2 px-3 py-2 data-[state=active]:bg-background"
            >
              <Megaphone className="h-4 w-4" />
              Marketing
            </TabsTrigger>
          </TabsList>
        </div>
        
        <div className="flex-1 overflow-auto p-6">

        <TabsContent value="generate" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Executive Brief Generator
                </CardTitle>
                <CardDescription>
                  Generate governance-compliant executive communications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Buyer Type</Label>
                  <Select value={buyerType} onValueChange={(v) => setBuyerType(v as BuyerType)}>
                    <SelectTrigger data-testid="select-buyer-type">
                      <SelectValue placeholder="Select buyer type" />
                    </SelectTrigger>
                    <SelectContent>
                      {BUYER_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} data-testid={`option-buyer-${opt.value}`}>
                          <div>
                            <div className="font-medium">{opt.label}</div>
                            <div className="text-xs text-muted-foreground">{opt.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Primary Pain Point</Label>
                  <Select value={painPoint} onValueChange={(v) => setPainPoint(v as PainPoint)}>
                    <SelectTrigger data-testid="select-pain-point">
                      <SelectValue placeholder="Select pain point" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAIN_POINT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} data-testid={`option-pain-${opt.value}`}>
                          <div>
                            <div className="font-medium">{opt.label}</div>
                            <div className="text-xs text-muted-foreground">{opt.icon}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Author Mode</Label>
                  <Select value={authorMode} onValueChange={(v) => setAuthorMode(v as AuthorMode)}>
                    <SelectTrigger data-testid="select-author-mode">
                      <SelectValue placeholder="Select writing style" />
                    </SelectTrigger>
                    <SelectContent>
                      {AUTHOR_MODE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} data-testid={`option-author-${opt.value}`}>
                          <div>
                            <div className="font-medium">{opt.label}</div>
                            <div className="text-xs text-muted-foreground">{opt.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Select Project</Label>
                  <Select value={selectedLeadId} onValueChange={handleProjectSelect}>
                    <SelectTrigger data-testid="select-project">
                      <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                      <SelectValue placeholder="Choose a project to auto-fill context..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No project selected</SelectItem>
                      {leads?.map((lead) => (
                        <SelectItem key={lead.id} value={lead.id.toString()} data-testid={`option-project-${lead.id}`}>
                          <div>
                            <div className="font-medium">{lead.projectName || lead.clientName || `Lead #${lead.id}`}</div>
                            <div className="text-xs text-muted-foreground">
                              {lead.clientName && lead.projectName ? lead.clientName : ""} 
                              {lead.projectAddress ? ` - ${lead.projectAddress}` : ""}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Select a project to auto-fill the context below.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Project Context</Label>
                  <Textarea
                    data-testid="input-project-context"
                    placeholder="Describe the project situation, client background, or specific concerns..."
                    value={projectContext}
                    onChange={(e) => setProjectContext(e.target.value)}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum 10 characters. The more context you provide, the more relevant the output.
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  data-testid="button-generate"
                  onClick={() => generateMutation.mutate()}
                  disabled={generateMutation.isPending || projectContext.length < 10}
                  className="w-full"
                >
                  {generateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating with Self-Check...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Executive Brief
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-green-600" />
                    Generated Output
                  </CardTitle>
                  <CardDescription>
                    Governance-verified content ready for use
                  </CardDescription>
                </div>
                {generatedContent && (
                  <Button variant="outline" size="sm" onClick={handleCopy} data-testid="button-copy">
                    {copied ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {generatedContent ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {generatedContent.violationCount > 0 && (
                        <Badge variant="outline" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {generatedContent.violationCount} violations fixed
                        </Badge>
                      )}
                      {generatedContent.rewriteAttempts > 0 && (
                        <Badge variant="outline" className="gap-1">
                          Self-corrected {generatedContent.rewriteAttempts}x
                        </Badge>
                      )}
                      <Badge variant="outline" className="gap-1">
                        <Clock className="h-3 w-3" />
                        {generatedContent.processingTimeMs}ms
                      </Badge>
                    </div>
                    
                    <ScrollArea className="h-[300px] rounded-md border p-4">
                      <div className="whitespace-pre-wrap text-sm">
                        {generatedContent.finalOutput}
                      </div>
                    </ScrollArea>

                    {generatedContent.violationsFound.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">Corrections Made:</h4>
                        <div className="space-y-2">
                          {generatedContent.violationsFound.slice(0, 3).map((v, i) => (
                            <div key={i} className="text-xs p-2 bg-muted rounded-md">
                              <span className="font-medium text-amber-600">{v.category}</span>: {v.rule}
                            </div>
                          ))}
                          {generatedContent.violationsFound.length > 3 && (
                            <p className="text-xs text-muted-foreground">
                              +{generatedContent.violationsFound.length - 3} more corrections
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[300px] text-center text-muted-foreground">
                    <BookOpen className="h-12 w-12 mb-4 opacity-50" />
                    <p>Configure your inputs and click Generate to create governance-compliant content.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="standards">
          <Card>
            <CardHeader>
              <CardTitle>Standard Definitions (The Hard Deck)</CardTitle>
              <CardDescription>
                Immutable facts and approved guarantee text. AI can only use these exact definitions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {standards?.data?.map((def) => (
                  <div key={def.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold">{def.term}</h3>
                      <Badge variant="outline">{def.category}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{def.definition}</p>
                    {def.guaranteeText && (
                      <div className="flex items-center gap-2 text-xs bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 p-2 rounded">
                        <ShieldCheck className="h-3 w-3 flex-shrink-0" />
                        <span className="font-mono">{def.guaranteeText}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="governance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Governance Red-Lines
              </CardTitle>
              <CardDescription>
                Rules that trigger AI self-correction. Content violating these is automatically rewritten.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {redLines?.data?.map((rule) => (
                  <div key={rule.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <Badge variant={rule.severity >= 3 ? "destructive" : rule.severity >= 2 ? "secondary" : "outline"}>
                        {rule.violationCategory}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Severity: {rule.severity}/3
                      </span>
                    </div>
                    <p className="text-sm font-medium">{rule.ruleContent}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>Generation Audit Log</CardTitle>
              <CardDescription>
                History of AI content generation with self-correction metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : auditLogs?.data?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No generations yet. Create your first executive brief above.
                </div>
              ) : (
                <div className="space-y-4">
                  {auditLogs?.data?.map((log) => (
                    <div key={log.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{log.buyerType}</Badge>
                          <Badge variant="outline">{log.painPoint}</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {log.promptContext}
                      </p>
                      <div className="flex items-center gap-4 text-xs">
                        {log.violationCount > 0 && (
                          <span className="text-amber-600">
                            {log.violationCount} violations fixed
                          </span>
                        )}
                        {log.rewriteAttempts > 0 && (
                          <span className="text-blue-600">
                            {log.rewriteAttempts} rewrites
                          </span>
                        )}
                        <span className="text-muted-foreground">
                          {log.processingTimeMs}ms
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personas" className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">Buyer Personas</h2>
            <p className="text-muted-foreground mb-6">
              8 distinct buyer types with tailored messaging strategies
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {BUYER_TYPE_OPTIONS.map((persona) => (
              <Card key={persona.value} className="hover-elevate">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Badge variant="outline">{persona.value}</Badge>
                    {persona.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{persona.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="proposals" className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">AI Proposal Generator</h2>
            <p className="text-muted-foreground mb-6">
              Generate persona-targeted proposals with advanced buyer psychology
            </p>
          </div>
          <ProposalGenerator />
        </TabsContent>

        <TabsContent value="negotiation" className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">Negotiation Console</h2>
            <p className="text-muted-foreground mb-6">
              AI-powered objection handling and response strategies
            </p>
          </div>
          <NegotiationConsole />
        </TabsContent>

        <TabsContent value="marketing" className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">Marketing Content Generator</h2>
            <p className="text-muted-foreground mb-6">
              Create persona-targeted marketing content across multiple formats
            </p>
          </div>
          <MarketingGenerator />
        </TabsContent>
        </div>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}
