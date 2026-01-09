import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  Brain,
  Copy,
  FileText,
  Loader2,
  Mail,
  MessageSquare,
  Sparkles,
  User,
  Zap,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Lead } from "@shared/schema";

interface BuyerPersona {
  id: number;
  code: string;
  roleTitle: string;
  primaryPain: string;
  secondaryPain: string | null;
  hiddenFear: string | null;
  valueDriver: string;
  dealbreaker: string | null;
  tonePreference: string;
  communicationStyle: string;
  attentionSpan: string;
  technicalTriggers: string[];
  emotionalTriggers: string[];
  avoidWords: string[];
}

interface DealAIAssistantProps {
  lead: Lead;
}

const EMAIL_TYPES = [
  { value: "introduction", label: "Introduction / First Touch" },
  { value: "follow_up", label: "Follow-up After Meeting" },
  { value: "proposal_send", label: "Proposal Delivery" },
  { value: "check_in", label: "Status Check-in" },
  { value: "objection_response", label: "Objection Response" },
  { value: "close_attempt", label: "Close / Decision Request" },
];

export function DealAIAssistant({ lead }: DealAIAssistantProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("proposal");
  const [generatedContent, setGeneratedContent] = useState<string>("");
  const [emailType, setEmailType] = useState("introduction");
  const [emailContext, setEmailContext] = useState("");
  const [scopeNotes, setScopeNotes] = useState("");
  const [objection, setObjection] = useState("");

  const buyerCode = lead.buyerPersona || "BP-A";

  const { data: persona, isLoading: personaLoading } = useQuery<BuyerPersona>({
    queryKey: ["/api/intelligence/personas", buyerCode],
    enabled: !!buyerCode,
  });

  const proposalMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/intelligence/generate/proposal", {
        buyerCode,
        projectName: lead.projectName || lead.clientName,
        projectType: "Commercial",
        squareFootage: lead.sqft?.toString() || "TBD",
        timeline: "Standard",
        scopeNotes: scopeNotes || lead.notes || undefined,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setGeneratedContent(data.content);
      toast({ title: "Proposal generated", description: "AI-generated proposal is ready for review" });
    },
    onError: (error: Error) => {
      toast({ title: "Generation failed", description: error.message, variant: "destructive" });
    },
  });

  const emailMutation = useMutation({
    mutationFn: async () => {
      const emailPrompts: Record<string, string> = {
        introduction: `Write an introduction email for a new prospect. We want to schedule a discovery call to understand their project needs. Project: ${lead.projectName || "their upcoming project"}. Be professional but warm.`,
        follow_up: `Write a follow-up email after an initial meeting. Reference the project discussion and next steps. Project: ${lead.projectName || "their project"}.`,
        proposal_send: `Write an email to send along with our proposal. Project: ${lead.projectName || "their project"}. Value: $${lead.value?.toLocaleString() || "TBD"}. Emphasize value over price.`,
        check_in: `Write a professional check-in email. We want to touch base on the project status and see if they have questions. Project: ${lead.projectName || "their project"}.`,
        objection_response: `Write an email responding to this concern: "${emailContext || "They need more time to decide"}". Be understanding but create urgency through value, not pressure.`,
        close_attempt: `Write an email to move toward closing the deal. Project: ${lead.projectName || "their project"}. Value: $${lead.value?.toLocaleString() || "TBD"}. Be direct but respectful.`,
      };

      const res = await apiRequest("POST", "/api/intelligence/generate/content", {
        buyerCode,
        contentType: "email",
        projectContext: {
          projectName: lead.projectName || lead.clientName,
          projectType: "Commercial",
          squareFootage: lead.sqft?.toString() || "TBD",
        },
        specificRequest: emailPrompts[emailType] + (emailContext ? `\n\nAdditional context: ${emailContext}` : ""),
      });
      return res.json();
    },
    onSuccess: (data) => {
      setGeneratedContent(data.content);
      toast({ title: "Email drafted", description: "AI-generated email is ready for review" });
    },
    onError: (error: Error) => {
      toast({ title: "Generation failed", description: error.message, variant: "destructive" });
    },
  });

  const negotiationMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/intelligence/generate/negotiation", {
        buyerCode,
        objectionRaised: objection,
        projectContext: `Project: ${lead.projectName || lead.clientName}, Value: $${lead.value?.toLocaleString() || "TBD"}, Stage: ${lead.dealStage}`,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setGeneratedContent(data.content);
      toast({ title: "Response brief generated", description: "Negotiation strategy is ready" });
    },
    onError: (error: Error) => {
      toast({ title: "Generation failed", description: error.message, variant: "destructive" });
    },
  });

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedContent);
    toast({ title: "Copied!", description: "Content copied to clipboard" });
  };

  const isGenerating = proposalMutation.isPending || emailMutation.isPending || negotiationMutation.isPending;

  if (!lead.buyerPersona) {
    return (
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="py-8">
          <div className="flex flex-col items-center text-center gap-4">
            <AlertCircle className="h-12 w-12 text-amber-500" />
            <div>
              <h3 className="font-semibold text-lg">Select a Buyer Persona</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Choose a buyer persona in the Lead Details tab to enable AI-powered content generation
                tailored to their communication style and pain points.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {persona && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Target Persona: {persona.roleTitle}
              </CardTitle>
              <Badge variant="outline">{persona.code}</Badge>
            </div>
            <CardDescription className="text-xs">
              All generated content is tailored to this buyer's psychology and communication preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Primary Pain:</span>
                <p className="font-medium">{persona.primaryPain}</p>
              </div>
              <div>
                <span className="text-muted-foreground">What They Value:</span>
                <p className="font-medium">{persona.valueDriver}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Communication Style:</span>
                <p className="font-medium">{persona.tonePreference}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Attention Span:</span>
                <p className="font-medium">{persona.attentionSpan}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="proposal" className="gap-2" data-testid="tab-ai-proposal">
            <FileText className="h-4 w-4" />
            Proposal
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-2" data-testid="tab-ai-email">
            <Mail className="h-4 w-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="objection" className="gap-2" data-testid="tab-ai-objection">
            <MessageSquare className="h-4 w-4" />
            Objection
          </TabsTrigger>
        </TabsList>

        <TabsContent value="proposal" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Generate Proposal Language
              </CardTitle>
              <CardDescription className="text-xs">
                Creates persona-targeted proposal text with executive summary, approach, and investment framing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm bg-muted/30 p-3 rounded-lg">
                <div>
                  <span className="text-muted-foreground">Project:</span>
                  <p className="font-medium">{lead.projectName || lead.clientName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Size:</span>
                  <p className="font-medium">{lead.sqft?.toLocaleString() || "TBD"} sqft</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Value:</span>
                  <p className="font-medium">${lead.value?.toLocaleString() || "TBD"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Stage:</span>
                  <p className="font-medium">{lead.dealStage}</p>
                </div>
              </div>

              <div>
                <Label htmlFor="scope-notes">Additional Scope Notes (optional)</Label>
                <Textarea
                  id="scope-notes"
                  placeholder="Any special requirements, conditions, or context for the proposal..."
                  value={scopeNotes}
                  onChange={(e) => setScopeNotes(e.target.value)}
                  className="mt-1"
                  data-testid="input-scope-notes"
                />
              </div>

              <Button
                onClick={() => proposalMutation.mutate()}
                disabled={isGenerating}
                className="w-full"
                data-testid="button-generate-proposal"
              >
                {proposalMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Brain className="h-4 w-4 mr-2" />
                )}
                Generate Proposal Language
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Draft Email
              </CardTitle>
              <CardDescription className="text-xs">
                Generate persona-targeted emails for any stage of the sales process
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Email Type</Label>
                <Select value={emailType} onValueChange={setEmailType}>
                  <SelectTrigger className="mt-1" data-testid="select-email-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EMAIL_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="email-context">Additional Context (optional)</Label>
                <Textarea
                  id="email-context"
                  placeholder="Any specific points to address, recent conversations, or context..."
                  value={emailContext}
                  onChange={(e) => setEmailContext(e.target.value)}
                  className="mt-1"
                  data-testid="input-email-context"
                />
              </div>

              <Button
                onClick={() => emailMutation.mutate()}
                disabled={isGenerating}
                className="w-full"
                data-testid="button-generate-email"
              >
                {emailMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                Draft Email
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="objection" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Handle Objection
              </CardTitle>
              <CardDescription className="text-xs">
                Get strategic guidance for handling objections based on persona psychology
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="objection">What objection or concern was raised?</Label>
                <Textarea
                  id="objection"
                  placeholder='e.g., "Your price is higher than competitors" or "We need to think about it"'
                  value={objection}
                  onChange={(e) => setObjection(e.target.value)}
                  className="mt-1"
                  data-testid="input-objection"
                />
              </div>

              <Button
                onClick={() => negotiationMutation.mutate()}
                disabled={isGenerating || !objection.trim()}
                className="w-full"
                data-testid="button-generate-response"
              >
                {negotiationMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Brain className="h-4 w-4 mr-2" />
                )}
                Generate Response Strategy
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {generatedContent && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Generated Content
              </CardTitle>
              <Button size="sm" variant="outline" onClick={copyToClipboard} data-testid="button-copy-content">
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                {generatedContent}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
