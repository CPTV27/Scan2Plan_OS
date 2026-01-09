import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Copy, CheckCircle2, FileText } from "lucide-react";
import { PersonaSelector } from "./PersonaSelector";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { BuyerPersona } from "@shared/schema";

const PROJECT_TYPES = [
  "Historic Renovation",
  "Adaptive Reuse",
  "New Construction (Existing Site)",
  "Tenant Improvement",
  "Infrastructure/MEP",
  "Facade Study",
];

export function ProposalGenerator() {
  const { toast } = useToast();
  const [persona, setPersona] = useState<BuyerPersona | null>(null);
  const [projectContext, setProjectContext] = useState({
    projectName: '',
    projectType: '',
    squareFootage: '',
    timeline: '',
    specialConditions: '',
    scopeNotes: ''
  });
  const [generatedContent, setGeneratedContent] = useState('');
  const [copied, setCopied] = useState(false);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/intelligence/generate/proposal", {
        buyerCode: persona?.code,
        ...projectContext,
        specialConditions: projectContext.specialConditions.split(',').map(s => s.trim()).filter(Boolean)
      });
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedContent(data.content);
      toast({
        title: "Proposal Generated",
        description: "AI-targeted proposal is ready for review.",
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
    await navigator.clipboard.writeText(generatedContent);
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
              <Label htmlFor="projectName">Project Name</Label>
              <Input
                id="projectName"
                data-testid="input-project-name"
                value={projectContext.projectName}
                onChange={e => setProjectContext({...projectContext, projectName: e.target.value})}
                placeholder="The Morrison Building Renovation"
              />
            </div>
            
            <div>
              <Label htmlFor="projectType">Project Type</Label>
              <Select
                value={projectContext.projectType}
                onValueChange={value => setProjectContext({...projectContext, projectType: value})}
              >
                <SelectTrigger data-testid="select-project-type">
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="squareFootage">Square Footage</Label>
              <Input
                id="squareFootage"
                data-testid="input-square-footage"
                value={projectContext.squareFootage}
                onChange={e => setProjectContext({...projectContext, squareFootage: e.target.value})}
                placeholder="45,000 SF"
              />
            </div>
            
            <div>
              <Label htmlFor="timeline">Timeline</Label>
              <Input
                id="timeline"
                data-testid="input-timeline"
                value={projectContext.timeline}
                onChange={e => setProjectContext({...projectContext, timeline: e.target.value})}
                placeholder="SD complete by March 15"
              />
            </div>
            
            <div>
              <Label htmlFor="specialConditions">Special Conditions</Label>
              <Input
                id="specialConditions"
                data-testid="input-special-conditions"
                value={projectContext.specialConditions}
                onChange={e => setProjectContext({...projectContext, specialConditions: e.target.value})}
                placeholder="Occupied, hazmat areas, limited access..."
              />
            </div>
            
            <div>
              <Label htmlFor="scopeNotes">Scope Notes</Label>
              <Textarea
                id="scopeNotes"
                data-testid="input-scope-notes"
                value={projectContext.scopeNotes}
                onChange={e => setProjectContext({...projectContext, scopeNotes: e.target.value})}
                placeholder="Any specific requirements, exclusions, or context..."
                className="min-h-[80px]"
              />
            </div>
            
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={!persona || generateMutation.isPending}
              className="w-full"
              data-testid="button-generate-proposal"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Proposal
                </>
              )}
            </Button>
          </div>
        </div>
        
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-base">Generated Proposal</CardTitle>
              {generatedContent && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  data-testid="button-copy-proposal"
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
              AI-targeted content for {persona?.roleTitle || 'selected persona'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              {generatedContent ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap text-sm font-sans">{generatedContent}</pre>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  Select a persona and fill in project details to generate a targeted proposal.
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
