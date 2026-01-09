import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Copy, CheckCircle2, Megaphone } from "lucide-react";
import { PersonaSelector } from "./PersonaSelector";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { BuyerPersona } from "@shared/schema";

const CONTENT_FORMATS = [
  { value: "email_sequence", label: "Email Sequence (3-part)" },
  { value: "ad_copy", label: "Ad Copy Variants" },
  { value: "social_post", label: "LinkedIn Post" },
  { value: "case_study", label: "Case Study Structure" },
  { value: "landing_page", label: "Landing Page Copy" },
];

export function MarketingGenerator() {
  const { toast } = useToast();
  const [persona, setPersona] = useState<BuyerPersona | null>(null);
  const [contentFormat, setContentFormat] = useState('');
  const [campaignTheme, setCampaignTheme] = useState('');
  const [specificAngle, setSpecificAngle] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [copied, setCopied] = useState(false);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/intelligence/generate/marketing", {
        buyerCode: persona?.code,
        contentFormat,
        campaignTheme,
        specificAngle
      });
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedContent(data.content);
      toast({
        title: "Marketing Content Generated",
        description: "Persona-targeted content ready for review.",
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
              <Label htmlFor="contentFormat">Content Format</Label>
              <Select
                value={contentFormat}
                onValueChange={setContentFormat}
              >
                <SelectTrigger data-testid="select-content-format">
                  <SelectValue placeholder="Select format..." />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_FORMATS.map(format => (
                    <SelectItem key={format.value} value={format.value}>{format.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="campaignTheme">Campaign Theme (Optional)</Label>
              <Input
                id="campaignTheme"
                data-testid="input-campaign-theme"
                value={campaignTheme}
                onChange={e => setCampaignTheme(e.target.value)}
                placeholder="e.g., Q1 Awareness Push, Historic Buildings Focus"
              />
            </div>
            
            <div>
              <Label htmlFor="specificAngle">Specific Angle (Optional)</Label>
              <Input
                id="specificAngle"
                data-testid="input-specific-angle"
                value={specificAngle}
                onChange={e => setSpecificAngle(e.target.value)}
                placeholder="e.g., RFI reduction, schedule certainty"
              />
            </div>
            
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={!persona || !contentFormat || generateMutation.isPending}
              className="w-full"
              data-testid="button-generate-marketing"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Megaphone className="mr-2 h-4 w-4" />
                  Generate Marketing Content
                </>
              )}
            </Button>
          </div>
        </div>
        
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-base">Generated Content</CardTitle>
              {generatedContent && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  data-testid="button-copy-marketing"
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
              {contentFormat 
                ? CONTENT_FORMATS.find(f => f.value === contentFormat)?.label 
                : 'Select a format to generate'
              } for {persona?.roleTitle || 'selected persona'}
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
                  <p className="mb-4">Select a persona and content format to generate targeted marketing content.</p>
                  <div className="text-left space-y-2">
                    <p className="text-xs font-medium">Available formats:</p>
                    <ul className="text-xs space-y-1 list-disc list-inside">
                      <li>Email Sequence - 3-email nurture campaign</li>
                      <li>Ad Copy - 3 variants with headlines and CTAs</li>
                      <li>LinkedIn Post - Hook + value + CTA</li>
                      <li>Case Study - Situation, challenge, approach, outcome</li>
                      <li>Landing Page - Hero, problems, solutions, proof</li>
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
