import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Copy, CheckCircle2, Shield } from "lucide-react";
import { PersonaSelector } from "./PersonaSelector";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { BuyerPersona } from "@shared/schema";

const COMMON_OBJECTIONS = [
  "Your price is too high",
  "We need this faster",
  "We're comparing other vendors",
  "Can you just do a basic scan?",
  "We might not need the full BIM model",
  "Let me check with my team",
  "The budget got cut"
];

const RELATIONSHIP_OPTIONS = [
  { value: "New prospect - first conversation", label: "New prospect" },
  { value: "Repeat client - good history", label: "Repeat client (good)" },
  { value: "Repeat client - some friction", label: "Repeat client (friction)" },
  { value: "Referral from existing client", label: "Referral" },
  { value: "Competitor's former client", label: "Competitor defector" },
];

export function NegotiationConsole() {
  const { toast } = useToast();
  const [persona, setPersona] = useState<BuyerPersona | null>(null);
  const [objection, setObjection] = useState('');
  const [context, setContext] = useState('');
  const [history, setHistory] = useState('');
  const [brief, setBrief] = useState('');
  const [copied, setCopied] = useState(false);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/intelligence/generate/negotiation", {
        buyerCode: persona?.code,
        objectionRaised: objection,
        projectContext: context,
        relationshipHistory: history
      });
      return response.json();
    },
    onSuccess: (data) => {
      setBrief(data.content);
      toast({
        title: "Response Brief Ready",
        description: "Negotiation strategy generated.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: (error as Error).message,
      });
    }
  });

  const handleCopy = async () => {
    await navigator.clipboard.writeText(brief);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <PersonaSelector 
            onSelect={setPersona}
            selected={persona?.code}
          />
          
          <div className="space-y-3">
            <div>
              <Label htmlFor="objection">Objection Raised</Label>
              <Textarea
                id="objection"
                data-testid="input-objection"
                value={objection}
                onChange={e => setObjection(e.target.value)}
                placeholder="What did they say?"
                className="min-h-[80px]"
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {COMMON_OBJECTIONS.map(obj => (
                  <Button
                    key={obj}
                    variant="outline"
                    size="sm"
                    onClick={() => setObjection(obj)}
                    data-testid={`objection-quick-${obj.slice(0, 10)}`}
                    className="text-xs"
                  >
                    {obj}
                  </Button>
                ))}
              </div>
            </div>
            
            <div>
              <Label htmlFor="context">Project Context</Label>
              <Textarea
                id="context"
                data-testid="input-context"
                value={context}
                onChange={e => setContext(e.target.value)}
                placeholder="What's the project? What's at stake?"
                className="min-h-[80px]"
              />
            </div>
            
            <div>
              <Label htmlFor="history">Relationship History</Label>
              <Select
                value={history}
                onValueChange={setHistory}
              >
                <SelectTrigger data-testid="select-relationship">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {RELATIONSHIP_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={!persona || !objection || generateMutation.isPending}
              className="w-full"
              data-testid="button-generate-negotiation"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Generate Response Strategy
                </>
              )}
            </Button>
          </div>
        </div>
        
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-base">Response Brief</CardTitle>
              {brief && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  data-testid="button-copy-brief"
                >
                  {copied ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
            <CardDescription>
              Tactical response for {persona?.roleTitle || 'selected persona'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              {brief ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap text-sm font-sans">{brief}</pre>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="mb-4">Select a persona and describe the objection to generate a response strategy.</p>
                  <div className="text-left space-y-2">
                    <p className="text-xs font-medium">The AI will provide:</p>
                    <ul className="text-xs space-y-1 list-disc list-inside">
                      <li>Diagnosis of what's really happening</li>
                      <li>Reframe language to pivot the conversation</li>
                      <li>Alternatives to offer (not discounts)</li>
                      <li>Walk away signals</li>
                      <li>Recommended next step</li>
                    </ul>
                  </div>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
