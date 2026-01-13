import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle,
  FileText,
  Send,
  Image,
  Loader2,
  BookOpen,
  DollarSign,
  Eye,
  Sparkles,
  Download,
} from "lucide-react";
import type { Lead, CpqQuote, CaseStudy } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

// Type for the pricing breakdown stored in JSONB
interface PricingBreakdown {
  scanningTotal?: number;
  bimTotal?: number;
  travelTotal?: number;
  addOnsTotal?: number;
  [key: string]: number | undefined;
}

// Helper to safely extract pricing breakdown from quote
function getPricingBreakdown(quote: CpqQuote | null): PricingBreakdown {
  if (!quote) return {};
  const breakdown = quote.pricingBreakdown as PricingBreakdown | null;
  return breakdown || {};
}
import { MARKETING_COPY, SCOPE_TEMPLATES, PAYMENT_TERMS, getScopeDescription } from "@shared/proposalContent";

const BUILDING_TYPE_TAGS: Record<string, string[]> = {
  "Commercial / Office": ["commercial", "office"],
  "Industrial / Warehouse": ["industrial", "warehouse", "manufacturing"],
  "Healthcare / Medical": ["healthcare", "hospital", "medical"],
  "Education / Campus": ["education", "campus", "school"],
  "Retail / Hospitality": ["retail", "hospitality", "hotel"],
  "Mixed Use": ["mixed-use", "commercial"],
  "Historical / Renovation": ["historic", "renovation", "hbim"],
  "Religious Building": ["religious", "church", "historic"],
  "Hotel / Resort": ["hotel", "hospitality"],
  "Theatre / Performing Arts": ["theatre", "historic"],
  "Museum / Gallery": ["museum", "gallery", "historic"],
  "Warehouse / Storage": ["warehouse", "industrial"],
  "Residential - Standard": ["residential"],
  "Residential - High-Rise": ["residential", "high-rise"],
};

function formatCurrency(value: number | string | null | undefined): string {
  const num = Number(value) || 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export default function ProposalBuilder() {
  const params = useParams<{ leadId: string }>();
  const leadId = Number(params.leadId);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [selectedCaseStudies, setSelectedCaseStudies] = useState<number[]>([]);
  const [isSending, setIsSending] = useState(false);

  const { data: lead, isLoading: leadLoading } = useQuery<Lead>({
    queryKey: ["/api/leads", leadId],
    enabled: !!leadId,
  });

  const { data: quotes = [] } = useQuery<CpqQuote[]>({
    queryKey: ["/api/leads", leadId, "cpq-quotes"],
    enabled: !!leadId,
  });

  const latestQuote = quotes.find((q) => q.isLatest);

  const buildingTypeTags = useMemo(() => {
    if (!lead?.buildingType) return [];
    return BUILDING_TYPE_TAGS[lead.buildingType] || [lead.buildingType.toLowerCase().split(/[\s\/]+/)[0]];
  }, [lead?.buildingType]);

  const { data: matchedCaseStudies = [], isLoading: studiesLoading } = useQuery<CaseStudy[]>({
    queryKey: ["/api/case-studies/match", buildingTypeTags],
    queryFn: async () => {
      if (buildingTypeTags.length === 0) return [];
      const params = new URLSearchParams();
      buildingTypeTags.forEach((tag) => params.append("tags", tag));
      const res = await fetch(`/api/case-studies/match?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch case studies");
      return res.json();
    },
    enabled: buildingTypeTags.length > 0,
  });

  const { data: allCaseStudies = [] } = useQuery<CaseStudy[]>({
    queryKey: ["/api/case-studies"],
  });

  const toggleCaseStudy = (id: number) => {
    setSelectedCaseStudies((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleSendProposal = async () => {
    setIsSending(true);
    try {
      const response = await fetch(`/api/proposals/${leadId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ caseStudyIds: selectedCaseStudies }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to send proposal");
      }
      
      const result = await response.json();
      
      toast({
        title: "Proposal Sent",
        description: `PDF generated (${Math.round(result.pdfSize / 1024)}KB). Lead status updated to "Proposal Sent".`,
      });
      
      setLocation(`/deals/${leadId}`);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send proposal",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await fetch(`/api/proposals/${leadId}/generate-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ caseStudyIds: selectedCaseStudies }),
      });
      
      if (!response.ok) throw new Error("Failed to generate PDF");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Scan2Plan_Proposal_${lead?.clientName || "Client"}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({ title: "PDF Downloaded", description: "Proposal PDF has been downloaded." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to download PDF", variant: "destructive" });
    }
  };

  if (leadLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Lead not found</p>
            <Button onClick={() => setLocation("/sales")} className="mt-4">
              Back to Sales
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedStudies = allCaseStudies.filter((s) => selectedCaseStudies.includes(s.id));

  return (
    <div className="h-full flex flex-col">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="flex items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation(`/deals/${leadId}`)} data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Proposal Builder</h1>
              <p className="text-sm text-muted-foreground">{lead.clientName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Building2 className="h-3 w-3" />
              {lead.buildingType || "Unknown"}
            </Badge>
            {latestQuote && (
              <Badge variant="secondary" className="gap-1">
                <DollarSign className="h-3 w-3" />
                {formatCurrency(latestQuote.totalPrice)}
              </Badge>
            )}
          </div>
        </div>

        <div className="px-4 pb-4">
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    step === s
                      ? "bg-primary text-primary-foreground"
                      : step > s
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step > s ? <CheckCircle className="h-4 w-4" /> : s}
                </div>
                <span className={`text-sm ${step === s ? "font-medium" : "text-muted-foreground"}`}>
                  {s === 1 ? "Scope & Price" : s === 2 ? "Case Studies" : "Preview"}
                </span>
                {s < 3 && <div className="flex-1 h-px bg-border mx-2" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        {step === 1 && (
          <div className="space-y-4 max-w-4xl mx-auto">
            <Card data-testid="card-scope-price">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Scope & Pricing Summary
                </CardTitle>
                <CardDescription>Review the quote details before building your proposal</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Client</p>
                    <p className="font-medium">{lead.clientName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Project Address</p>
                    <p className="font-medium">{lead.projectAddress || "Not specified"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Building Type</p>
                    <p className="font-medium">{lead.buildingType || "Not specified"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Scope</p>
                    <p className="font-medium">{lead.scope || "Full Building"}</p>
                  </div>
                </div>

                <Separator />

                {latestQuote ? (
                  <div className="space-y-4">
                    <h3 className="font-semibold">Pricing Breakdown</h3>
                    {(() => {
                      const breakdown = getPricingBreakdown(latestQuote);
                      return (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 rounded-md bg-muted/50">
                            <p className="text-sm text-muted-foreground">Scanning</p>
                            <p className="text-lg font-semibold">{formatCurrency(breakdown.scanningTotal)}</p>
                          </div>
                          <div className="p-3 rounded-md bg-muted/50">
                            <p className="text-sm text-muted-foreground">BIM Modeling</p>
                            <p className="text-lg font-semibold">{formatCurrency(breakdown.bimTotal)}</p>
                          </div>
                          <div className="p-3 rounded-md bg-muted/50">
                            <p className="text-sm text-muted-foreground">Travel</p>
                            <p className="text-lg font-semibold">{formatCurrency(breakdown.travelTotal)}</p>
                          </div>
                          <div className="p-3 rounded-md bg-muted/50">
                            <p className="text-sm text-muted-foreground">Add-Ons</p>
                            <p className="text-lg font-semibold">{formatCurrency(breakdown.addOnsTotal)}</p>
                          </div>
                        </div>
                      );
                    })()}
                    <div className="p-4 rounded-md bg-primary/10 border border-primary/20">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-lg">Total Quote</p>
                        <p className="text-2xl font-bold text-primary">{formatCurrency(latestQuote.totalPrice)}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No quote created yet.</p>
                    <Button variant="outline" className="mt-2" onClick={() => setLocation(`/deals/${leadId}`)}>
                      Create Quote First
                    </Button>
                  </div>
                )}
              </CardContent>
              <CardFooter className="justify-end">
                <Button onClick={() => setStep(2)} disabled={!latestQuote} data-testid="button-next-step">
                  Next: Select Case Studies
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 max-w-4xl mx-auto">
            <Card data-testid="card-case-studies">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Smart Match: Recommended Case Studies
                </CardTitle>
                <CardDescription>
                  Based on building type: <Badge variant="outline">{lead.buildingType}</Badge>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {studiesLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))}
                  </div>
                ) : matchedCaseStudies.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No matching case studies found. Select from all available below.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {matchedCaseStudies.map((study) => (
                      <CaseStudyCard
                        key={study.id}
                        study={study}
                        selected={selectedCaseStudies.includes(study.id)}
                        onToggle={() => toggleCaseStudy(study.id)}
                        recommended
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  All Case Studies
                </CardTitle>
                <CardDescription>Select additional case studies to include</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {allCaseStudies
                    .filter((s) => !matchedCaseStudies.some((m) => m.id === s.id))
                    .map((study) => (
                      <CaseStudyCard
                        key={study.id}
                        study={study}
                        selected={selectedCaseStudies.includes(study.id)}
                        onToggle={() => toggleCaseStudy(study.id)}
                      />
                    ))}
                </div>
              </CardContent>
              <CardFooter className="justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button onClick={() => setStep(3)} data-testid="button-preview">
                  Preview Proposal
                  <Eye className="h-4 w-4 ml-2" />
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 max-w-5xl mx-auto">
            <Card data-testid="card-preview">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Proposal Preview
                </CardTitle>
                <CardDescription>Review before sending to client</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md bg-white dark:bg-zinc-900 shadow-inner">
                  <div className="p-8 space-y-8">
                    <div className="text-center border-b pb-8">
                      <h1 className="text-3xl font-bold">{MARKETING_COPY.companyName}</h1>
                      <p className="text-muted-foreground mt-2">{MARKETING_COPY.tagline}</p>
                    </div>

                    <div className="space-y-4">
                      <h2 className="text-xl font-semibold">Proposal for: {lead.clientName}</h2>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Project Address</p>
                          <p className="font-medium">{lead.projectAddress}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Building Type</p>
                          <p className="font-medium">{lead.buildingType}</p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h2 className="text-xl font-semibold">About Scan2Plan</h2>
                      <p className="text-muted-foreground">{MARKETING_COPY.aboutUs}</p>
                      <div className="grid gap-3 mt-4">
                        {MARKETING_COPY.theDifference.map((item, idx) => (
                          <div key={idx} className="p-3 rounded-md bg-muted/50">
                            <h4 className="font-medium">{item.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">{item.body}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h2 className="text-xl font-semibold">Scope of Work</h2>
                      <div className="text-muted-foreground whitespace-pre-line">
                        {getScopeDescription(lead.scope || "Full Building", "LOD 300")}
                      </div>
                    </div>

                    {latestQuote && (() => {
                      const breakdown = getPricingBreakdown(latestQuote);
                      return (
                        <>
                          <Separator />
                          <div className="space-y-4">
                            <h2 className="text-xl font-semibold">Pricing</h2>
                            <div className="border rounded-md overflow-hidden">
                              <table className="w-full text-sm">
                                <thead className="bg-muted">
                                  <tr>
                                    <th className="text-left p-3">Service</th>
                                    <th className="text-right p-3">Amount</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr className="border-t">
                                    <td className="p-3">Laser Scanning Services</td>
                                    <td className="text-right p-3">{formatCurrency(breakdown.scanningTotal)}</td>
                                  </tr>
                                  <tr className="border-t">
                                    <td className="p-3">BIM Modeling Services</td>
                                    <td className="text-right p-3">{formatCurrency(breakdown.bimTotal)}</td>
                                  </tr>
                                  <tr className="border-t">
                                    <td className="p-3">Travel & Logistics</td>
                                    <td className="text-right p-3">{formatCurrency(breakdown.travelTotal)}</td>
                                  </tr>
                                  {Number(breakdown.addOnsTotal) > 0 && (
                                    <tr className="border-t">
                                      <td className="p-3">Additional Services</td>
                                      <td className="text-right p-3">{formatCurrency(breakdown.addOnsTotal)}</td>
                                    </tr>
                                  )}
                                  <tr className="border-t bg-primary/10 font-semibold">
                                    <td className="p-3">Total</td>
                                    <td className="text-right p-3">{formatCurrency(latestQuote.totalPrice)}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </>
                      );
                    })()}

                    {selectedStudies.length > 0 && (
                      <>
                        <Separator />
                        <div className="space-y-4">
                          <h2 className="text-xl font-semibold">Similar Projects</h2>
                          <div className="grid gap-4">
                            {selectedStudies.map((study) => (
                              <div key={study.id} className="p-4 border rounded-md">
                                <h3 className="font-semibold">{study.title}</h3>
                                <p className="text-sm text-muted-foreground mt-1">{study.blurb}</p>
                                {study.stats && typeof study.stats === 'object' ? (
                                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                                    {Object.entries(study.stats as Record<string, string>).map(([key, val]) => (
                                      <span key={key}>
                                        {key}: <strong>{String(val)}</strong>
                                      </span>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    <Separator />

                    <div className="space-y-4">
                      <h2 className="text-xl font-semibold">Terms & Conditions</h2>
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <p><strong>Deposit:</strong> {PAYMENT_TERMS.deposit}</p>
                        <p><strong>Final Payment:</strong> {PAYMENT_TERMS.final}</p>
                        <p><strong>Payment Methods:</strong> {PAYMENT_TERMS.methods.join(", ")}</p>
                        <p>{PAYMENT_TERMS.validity}</p>
                        <p>{PAYMENT_TERMS.warranty}</p>
                      </div>
                      <div className="mt-8 pt-8 border-t">
                        <p className="text-xs text-muted-foreground text-center">[sig|req|signer1]</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="justify-between gap-2">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleDownloadPDF} data-testid="button-download-pdf">
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                  <Button onClick={handleSendProposal} disabled={isSending} data-testid="button-send-proposal">
                    {isSending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Proposal
                      </>
                    )}
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function CaseStudyCard({
  study,
  selected,
  onToggle,
  recommended,
}: {
  study: CaseStudy;
  selected: boolean;
  onToggle: () => void;
  recommended?: boolean;
}) {
  return (
    <div
      className={`p-4 border rounded-md flex items-start gap-4 cursor-pointer transition-colors ${
        selected ? "border-primary bg-primary/5" : "hover-elevate"
      }`}
      onClick={onToggle}
      data-testid={`case-study-${study.id}`}
    >
      <Checkbox checked={selected} className="mt-1" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-medium">{study.title}</h3>
          {recommended && (
            <Badge variant="secondary" className="text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              Recommended
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{study.blurb}</p>
        <div className="flex gap-2 mt-2 flex-wrap">
          {study.tags.slice(0, 4).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </div>
      {study.stats && typeof study.stats === 'object' ? (
        <div className="text-right text-sm text-muted-foreground shrink-0">
          {Object.entries(study.stats as Record<string, string>)
            .slice(0, 2)
            .map(([key, val]) => (
              <div key={key}>
                <span className="text-xs">{key}:</span> <strong>{String(val)}</strong>
              </div>
            ))}
        </div>
      ) : null}
    </div>
  );
}
