import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Shield, Target, Zap, Brain, Calculator, FileSearch, TrendingUp, MessageSquare, FileText, Sparkles, AlertTriangle, Star, CheckCircle, Settings, GitBranch, Play, Palette } from "lucide-react";
import { Sidebar, MobileHeader } from "@/components/Sidebar";

export default function HelpCenter() {
  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <MobileHeader />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-5xl mx-auto space-y-8">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <BookOpen className="h-8 w-8 text-primary" />
                S2P Academy
              </h1>
              <p className="text-muted-foreground mt-2">The official Operator's Manual for the Scan2Plan OS.</p>
            </div>

            <Tabs defaultValue="ai-tools" className="w-full">
              <TabsList className="grid w-full grid-cols-6 mb-8">
                <TabsTrigger value="ai-tools" data-testid="tab-ai-tools" className="gap-1">
                  <Brain className="h-4 w-4" />
                  AI & Tools
                </TabsTrigger>
                <TabsTrigger value="sales" data-testid="tab-sales">Growth & Sales</TabsTrigger>
                <TabsTrigger value="ops" data-testid="tab-ops">Operations</TabsTrigger>
                <TabsTrigger value="settings" data-testid="tab-settings" className="gap-1">
                  <Settings className="h-4 w-4" />
                  Settings
                </TabsTrigger>
                <TabsTrigger value="strategy" data-testid="tab-strategy">The Strategy</TabsTrigger>
                <TabsTrigger value="faq" data-testid="tab-faq">FAQ</TabsTrigger>
              </TabsList>

              {/* AI & Tools Tab - New comprehensive documentation */}
              <TabsContent value="ai-tools" className="space-y-4">
                {/* Profitability Gates Section */}
                <Card className="border-amber-500/20 bg-amber-500/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-amber-500" />
                      Profitability Gates
                      <Badge variant="secondary" className="ml-auto">New</Badge>
                    </CardTitle>
                    <CardDescription>Automated business rules that protect your margins and ensure deal quality.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="gm-gate">
                        <AccordionTrigger className="text-left">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                            40% Gross Margin Floor (CEO Override Available)
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground space-y-3">
                          <p><strong className="text-foreground">What it does:</strong> Shows a warning if your quote's gross margin falls below 40%. CEO can override and proceed with strategic pricing.</p>
                          <p><strong className="text-foreground">Why it matters:</strong> Protects profitability by preventing you from accidentally sending proposals that would lose money.</p>
                          <div className="bg-card p-3 rounded-lg border mt-2">
                            <p className="font-medium text-sm">When below 40%:</p>
                            <ol className="list-decimal pl-5 mt-2 space-y-1 text-sm">
                              <li>Warning banner displays in Quote Builder</li>
                              <li>CEO can acknowledge and proceed with strategic pricing</li>
                              <li>Or adjust prices/scope to improve margin</li>
                              <li>Quote still saves - full flexibility for the CEO</li>
                            </ol>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="tier-a-auto">
                        <AccordionTrigger className="text-left">
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 text-amber-500" />
                            Auto Tier A Flagging (50K+ sqft)
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground space-y-3">
                          <p><strong className="text-foreground">What it does:</strong> Automatically flags leads as "Tier A" when square footage reaches 50,000+ sqft.</p>
                          <p><strong className="text-foreground">What happens:</strong></p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li>Lead is tagged with amber "Tier A" badge in the header</li>
                            <li>Priority is automatically set to 5 (Highest)</li>
                            <li>Estimator card section appears in deal workspace (recommended)</li>
                            <li>Consider using Tier A pricing mode in CPQ for more accurate estimates</li>
                          </ul>
                          <p className="text-sm mt-2 border-t pt-2"><strong className="text-foreground">Tip:</strong> Large projects need extra attention. The estimator card helps ensure accurate pricing.</p>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="attribution-gate">
                        <AccordionTrigger className="text-left">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            Lead Source Attribution (Closed Won Gate)
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground space-y-3">
                          <p><strong className="text-foreground">What it does:</strong> Requires a lead source before marking a deal as "Closed Won".</p>
                          <p><strong className="text-foreground">Why it matters:</strong> Tracks which marketing channels generate revenue, enabling smarter marketing spend.</p>
                          <div className="bg-card p-3 rounded-lg border mt-2">
                            <p className="font-medium text-sm">Lead Source Options:</p>
                            <div className="grid grid-cols-2 gap-1 mt-2 text-sm">
                              <span>Referral (Design Pro)</span>
                              <span>Referral (Existing Client)</span>
                              <span>CEU Event</span>
                              <span>LinkedIn</span>
                              <span>Google Search</span>
                              <span>Industry Event</span>
                              <span>Cold Outreach</span>
                              <span>Website Inquiry</span>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="estimator-card">
                        <AccordionTrigger className="text-left">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-blue-500" />
                            Estimator Card (Tier A Recommendation)
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground space-y-3">
                          <p><strong className="text-foreground">What it does:</strong> Recommends adding an estimator card for Tier A projects to improve proposal accuracy.</p>
                          <p><strong className="text-foreground">Not a hard blocker:</strong> You can still generate proposals without it, but accuracy may be lower.</p>
                          <div className="bg-card p-3 rounded-lg border mt-2">
                            <p className="font-medium text-sm">How to use:</p>
                            <ol className="list-decimal pl-5 mt-2 space-y-1 text-sm">
                              <li>Create your estimator card in Google Sheets or Excel</li>
                              <li>Upload to Google Drive and get the share link</li>
                              <li>Paste the link in the "Estimator Card URL" field</li>
                              <li>Click Save to link it to the deal</li>
                            </ol>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                </Card>

                {/* AI Features Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-primary" />
                      AI-Powered Features
                    </CardTitle>
                    <CardDescription>6 intelligent features that automate and enhance your workflow.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="ai-scoping">
                        <AccordionTrigger className="text-left">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-purple-500" />
                            1. Intelligent Scoping Assistant
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground space-y-3">
                          <p><strong className="text-foreground">What it does:</strong> Analyzes project descriptions and suggests building type, LOD, scope, and disciplines.</p>
                          <p><strong className="text-foreground">How to use:</strong></p>
                          <ol className="list-decimal pl-5 space-y-1">
                            <li>Open the CPQ Calculator (Quote Builder tab)</li>
                            <li>Click the "AI Assist" button or describe your project</li>
                            <li>AI suggests appropriate settings based on project type</li>
                            <li>Review and apply suggestions with one click</li>
                          </ol>
                          <p className="text-sm mt-2 text-green-600 dark:text-green-400">Best for: New leads with vague requirements</p>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="ai-document">
                        <AccordionTrigger className="text-left">
                          <div className="flex items-center gap-2">
                            <FileSearch className="h-4 w-4 text-blue-500" />
                            2. Document Intelligence (RFP Processor)
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground space-y-3">
                          <p><strong className="text-foreground">What it does:</strong> Extracts project requirements from uploaded RFPs, SOWs, and specifications.</p>
                          <p><strong className="text-foreground">Supported formats:</strong> PDF, Word documents, plain text</p>
                          <p><strong className="text-foreground">What it extracts:</strong></p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li>Square footage and building dimensions</li>
                            <li>Required deliverables (LOD, disciplines)</li>
                            <li>Timeline and deadline requirements</li>
                            <li>Risk flags (tight deadlines, unusual requirements)</li>
                          </ul>
                          <p className="text-sm mt-2 text-green-600 dark:text-green-400">Best for: RFP responses and formal bid requests</p>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="ai-deal">
                        <AccordionTrigger className="text-left">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-green-500" />
                            3. Predictive Deal Intelligence
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground space-y-3">
                          <p><strong className="text-foreground">What it does:</strong> Predicts win probability and identifies deal risks based on historical patterns.</p>
                          <p><strong className="text-foreground">How to access:</strong> Click "Deal Intelligence" in the deal workspace</p>
                          <p><strong className="text-foreground">What you'll see:</strong></p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Win Probability:</strong> Percentage chance of closing the deal</li>
                            <li><strong>Risk Factors:</strong> Things that might hurt your chances</li>
                            <li><strong>Recommendations:</strong> Actions to improve odds</li>
                            <li><strong>Similar Deals:</strong> Past projects with similar profiles</li>
                          </ul>
                          <p className="text-sm mt-2 text-green-600 dark:text-green-400">Best for: Pipeline reviews and forecasting</p>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="ai-cpq-chat">
                        <AccordionTrigger className="text-left">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-orange-500" />
                            4. Natural Language CPQ
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground space-y-3">
                          <p><strong className="text-foreground">What it does:</strong> Create quotes by describing the project in plain English.</p>
                          <p><strong className="text-foreground">Example prompts:</strong></p>
                          <div className="bg-card p-3 rounded-lg border mt-2 space-y-2">
                            <p className="text-sm italic">"I need a quote for a 25,000 sqft warehouse in Brooklyn with full MEP and structural at LOD 300"</p>
                            <p className="text-sm italic">"Historic building renovation, 3 floors, about 40k sqft, architecture and structural only"</p>
                            <p className="text-sm italic">"Quick exterior scan of a 5-acre industrial site"</p>
                          </div>
                          <p className="text-sm mt-2 text-green-600 dark:text-green-400">Best for: Quick phone quotes and initial estimates</p>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="ai-proposal">
                        <AccordionTrigger className="text-left">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-red-500" />
                            5. AI Proposal Generator
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground space-y-3">
                          <p><strong className="text-foreground">What it does:</strong> Generates personalized proposals based on buyer persona and project details.</p>
                          <p><strong className="text-foreground">Template options:</strong></p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Technical:</strong> Detailed specs for engineers</li>
                            <li><strong>Executive:</strong> ROI-focused for decision makers</li>
                            <li><strong>Standard:</strong> Balanced for general use</li>
                          </ul>
                          <p><strong className="text-foreground">Gate requirements:</strong></p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li>Quote must have 40%+ gross margin</li>
                            <li>Tier A deals should have estimator card (recommended)</li>
                          </ul>
                          <p className="text-sm mt-2 text-green-600 dark:text-green-400">Best for: Formal proposals and competitive bids</p>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="ai-matching">
                        <AccordionTrigger className="text-left">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-cyan-500" />
                            6. Smart Project Matching
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground space-y-3">
                          <p><strong className="text-foreground">What it does:</strong> Finds similar past projects to use as references or case studies.</p>
                          <p><strong className="text-foreground">Matching criteria:</strong></p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li>Building type and square footage</li>
                            <li>Required disciplines and LOD</li>
                            <li>Geographic proximity</li>
                            <li>Buyer persona similarity</li>
                          </ul>
                          <p><strong className="text-foreground">Use cases:</strong></p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li>Reference pricing for similar projects</li>
                            <li>Case studies for proposals</li>
                            <li>Estimating timeline and complexity</li>
                          </ul>
                          <p className="text-sm mt-2 text-green-600 dark:text-green-400">Best for: Building credibility and accurate estimates</p>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                </Card>

                {/* CPQ Calculator Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calculator className="h-5 w-5" />
                      CPQ Calculator Guide
                    </CardTitle>
                    <CardDescription>Master the Configure-Price-Quote system for accurate proposals.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="cpq-areas">
                        <AccordionTrigger>Building vs. Landscape Areas</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground space-y-3">
                          <p><strong className="text-foreground">Building Areas:</strong> Measured in square feet. Use for interiors, structures, and enclosed spaces.</p>
                          <p><strong className="text-foreground">Landscape Areas:</strong> Measured in acres. Use for sites, parking lots, and outdoor areas. Auto-converts to sqft (1 acre = 43,560 sqft).</p>
                          <p className="text-sm mt-2">You can add multiple areas of either type to a single quote.</p>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="cpq-pricing">
                        <AccordionTrigger>Pricing Modes</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground space-y-3">
                          <p><strong className="text-foreground">Standard Pricing:</strong> Automatic calculation based on building type, LOD, scope, and disciplines. Best for typical projects under 50K sqft.</p>
                          <p><strong className="text-foreground">Tier A Pricing:</strong> Manual entry of scanning cost + modeling cost with target margin. System calculates final price. Best for large/complex projects 50K+ sqft.</p>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="cpq-travel">
                        <AccordionTrigger>Travel Calculation</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground space-y-3">
                          <p><strong className="text-foreground">How to calculate travel:</strong></p>
                          <ol className="list-decimal pl-5 space-y-1">
                            <li>Select <strong>Dispatch Location</strong> (Brooklyn, Woodstock, or Troy)</li>
                            <li>Enter the <strong>Project Address</strong></li>
                            <li>Click <strong>"Calculate Distance"</strong> to get mileage</li>
                          </ol>

                          <p className="mt-3"><strong className="text-foreground">Tier-Based Pricing (Dispatch from Brooklyn):</strong></p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li>Tier A (50K+ sqft): No base fee, $4/mile over 20 miles</li>
                            <li>Tier B (10K-49,999 sqft): $300 base + $4/mile over 20 miles</li>
                            <li>Tier C (&lt;10K sqft): $150 base + $4/mile over 20 miles</li>
                          </ul>
                          <p><strong className="text-foreground">Woodstock/Troy:</strong> Flat $3/mile (no base fee)</p>

                          <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
                            <p className="font-medium text-foreground">Custom Travel Cost (Manual Override)</p>
                            <p className="text-sm mt-1">Enter a custom dollar amount in the optional field to override the calculated travel cost. Leave empty to use the automatic tier-based pricing.</p>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="cpq-margin">
                        <AccordionTrigger>Margin Target Slider</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground space-y-3">
                          <p><strong className="text-foreground">What it does:</strong> Adjusts your target margin and automatically calculates the client price.</p>
                          <p><strong className="text-foreground">Range:</strong> 20% to 65%</p>
                          <p><strong className="text-foreground">How it works:</strong></p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li>Set your desired margin using the slider</li>
                            <li>System calculates: Client Price = Cost ÷ (1 - Margin)</li>
                            <li>Price updates automatically as you adjust</li>
                          </ul>
                          <p><strong className="text-foreground">Guardrails:</strong></p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li><span className="text-yellow-600 font-medium">45%:</span> Warning - below stretch goal</li>
                            <li><span className="text-red-600 font-medium">40%:</span> Standard floor - requires CEO confirmation</li>
                          </ul>
                          <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-md">
                            <p className="font-medium text-foreground">CEO Override</p>
                            <p className="text-sm mt-1">Margins below 40% show a warning but can still be saved. The CEO can acknowledge and proceed with strategic pricing when needed.</p>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="cpq-payment">
                        <AccordionTrigger>Payment Terms</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground space-y-3">
                          <p><strong className="text-foreground">Available options:</strong></p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Net 15:</strong> Full payment within 15 days</li>
                            <li><strong>Net 30:</strong> Full payment within 30 days</li>
                            <li><strong>Net 45:</strong> Full payment within 45 days</li>
                            <li><strong>50/50:</strong> 50% upfront, 50% on completion</li>
                            <li><strong>25/75:</strong> 25% upfront, 75% on completion</li>
                          </ul>
                          <p className="text-sm mt-2">Payment terms are included in proposals and QuickBooks estimates.</p>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="cpq-disciplines">
                        <AccordionTrigger>Disciplines & LOD</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground space-y-3">
                          <p><strong className="text-foreground">Available Disciplines:</strong></p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Architecture:</strong> Walls, doors, windows, finishes</li>
                            <li><strong>Structural:</strong> Columns, beams, foundations</li>
                            <li><strong>MEP:</strong> Mechanical, electrical, plumbing systems</li>
                            <li><strong>Site:</strong> Exterior, topography, landscape</li>
                          </ul>
                          <p><strong className="text-foreground">LOD Levels:</strong></p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li><strong>LOD 200:</strong> Basic geometry (fastest, lowest cost)</li>
                            <li><strong>LOD 300:</strong> Standard detail (most common)</li>
                            <li><strong>LOD 400:</strong> High detail (fabrication-ready)</li>
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="sales" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      The Growth Engine Workflow
                    </CardTitle>
                    <CardDescription>How to use the Persona System to drive referrals.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible>
                      <AccordionItem value="item-1">
                        <AccordionTrigger>Step 1: The Persona Selector (Crucial)</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground space-y-2">
                          <p>When you add a Lead, you MUST select a <strong className="text-foreground">Buyer Persona (BP)</strong>. This isn't just a tag; it tells the system which script to write.</p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li><strong className="text-foreground">BP1 (Engineer):</strong> Triggers "Risk/Coordination" scripts.</li>
                            <li><strong className="text-foreground">BP5 (Architect):</strong> Triggers "Design Intent" scripts.</li>
                            <li><strong className="text-foreground">BP6 (Developer):</strong> Triggers "BOMA/Revenue" scripts.</li>
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="item-2">
                        <AccordionTrigger>Step 2: Feeding the Evidence Vault</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                          <p>The "Scripts" are only as good as the data in the Vault. If you close a deal or find a great stat (e.g., "Saved $50k"), go to <strong className="text-foreground">Marketing &gt; Evidence Vault</strong> and add it. Give it a 5-star rating to ensure it gets used immediately.</p>
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="item-3">
                        <AccordionTrigger>Step 3: The Content Queue</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                          <p>When Ops flags a &gt;10% Variance, the "Truth Loop" will auto-generate a LinkedIn post for you. Check the <strong className="text-foreground">Marketing &gt; Content Queue</strong> tab daily for these "Stat Bombs."</p>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                </Card>

                <Card className="border-green-500/20 bg-green-500/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-green-500" />
                      PandaDoc Integration
                      <Badge variant="secondary" className="ml-auto">New</Badge>
                    </CardTitle>
                    <CardDescription>Create, edit, and send proposals directly from the Deal Workspace.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="pandadoc-1">
                        <AccordionTrigger className="text-left">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-green-500" />
                            Creating a Proposal
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground space-y-3">
                          <p><strong className="text-foreground">How to create:</strong></p>
                          <ol className="list-decimal pl-5 space-y-1">
                            <li>Open a deal from the Sales pipeline</li>
                            <li>Create and save a quote in the Quote Builder tab</li>
                            <li>Go to the <strong className="text-foreground">Proposal</strong> tab</li>
                            <li>Click <strong className="text-foreground">"Create Proposal"</strong> button</li>
                            <li>PandaDoc document is created from your quote data</li>
                          </ol>
                          <p className="text-sm mt-2 text-green-600 dark:text-green-400">Tip: Your quote must be saved before you can create a proposal.</p>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="pandadoc-2">
                        <AccordionTrigger className="text-left">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-blue-500" />
                            Editing & Sending
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground space-y-3">
                          <p><strong className="text-foreground">Embedded Editor:</strong> Edit proposals directly in the app without leaving the Deal Workspace.</p>
                          <p><strong className="text-foreground">What you can do:</strong></p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li>Add and edit pricing tables</li>
                            <li>Place signature fields</li>
                            <li>Customize content and formatting</li>
                            <li>Preview the final document</li>
                          </ul>
                          <p><strong className="text-foreground">Sending:</strong> Click "Send for Signature" when ready. The client receives an email with a link to sign.</p>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="pandadoc-3">
                        <AccordionTrigger className="text-left">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            Auto-Close on Signature
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground space-y-3">
                          <p><strong className="text-foreground">What happens when signed:</strong></p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li>Deal automatically moves to "Closed Won"</li>
                            <li>Project is created in Production module</li>
                            <li>Quote data transfers to the new project</li>
                          </ul>
                          <p className="text-sm mt-2 border-t pt-2">Status updates (viewed, sent, completed) sync automatically via webhook.</p>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calculator className="h-5 w-5" />
                      QuickBooks Integration
                    </CardTitle>
                    <CardDescription>Financial sync, expense tracking, and job costing.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="qbo-1">
                        <AccordionTrigger>Expense Auto-Linking</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground space-y-3">
                          <p><strong className="text-foreground">What it does:</strong> Expenses and bills from QuickBooks are automatically linked to projects.</p>
                          <p><strong className="text-foreground">How it works:</strong></p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li>Syncs purchases and vendor bills from QBO</li>
                            <li>Matches to leads via customer reference</li>
                            <li>Prioritizes Closed Won deals, then most recent</li>
                          </ul>
                          <p className="text-sm mt-2 text-green-600 dark:text-green-400">Check Financial &gt; Sync Expenses to run manually.</p>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="qbo-2">
                        <AccordionTrigger>Job Costing Analytics</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground space-y-3">
                          <p><strong className="text-foreground">What you'll see:</strong></p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Actual vs Quoted Margin:</strong> Compare real costs to estimates</li>
                            <li><strong>Cost Categories:</strong> Labor, materials, subcontractors, overhead</li>
                            <li><strong>Profitability Summary:</strong> Per-project profit analysis</li>
                          </ul>
                          <p><strong className="text-foreground">Where to find it:</strong> Analytics &gt; Job Costing</p>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="ops" className="space-y-4">
                <Card className="border-blue-500/20 bg-blue-500/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-blue-500" />
                      Production Workflow
                      <Badge variant="secondary" className="ml-auto">7 Stages</Badge>
                    </CardTitle>
                    <CardDescription>Track projects from closed deal to final delivery.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="prod-stages">
                        <AccordionTrigger>The 7 Production Stages</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground space-y-3">
                          <ol className="list-decimal pl-5 space-y-2">
                            <li><strong className="text-foreground">Scheduling:</strong> Project created from Closed Won deal, assign scan dates</li>
                            <li><strong className="text-foreground">Scanning:</strong> Field team captures point cloud data</li>
                            <li><strong className="text-foreground">Processing:</strong> Raw data cleaned and registered</li>
                            <li><strong className="text-foreground">Modeling:</strong> BIM model creation in progress</li>
                            <li><strong className="text-foreground">QC:</strong> Quality check and variance audit</li>
                            <li><strong className="text-foreground">Delivered:</strong> Sent to client</li>
                            <li><strong className="text-foreground">Archived:</strong> Project complete, closed out</li>
                          </ol>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="prod-create">
                        <AccordionTrigger>Project Creation (Automatic)</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground space-y-3">
                          <p><strong className="text-foreground">What happens when a deal closes:</strong></p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li>Project automatically created in Production</li>
                            <li>Quote data transfers (price, margin, areas, services)</li>
                            <li>Scope summary auto-generated from CPQ inputs</li>
                            <li>Project appears in Scheduling column</li>
                          </ul>
                          <p className="text-sm mt-2 text-green-600 dark:text-green-400">No manual data entry required - everything flows from the deal.</p>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      Site Readiness Checklist
                    </CardTitle>
                    <CardDescription>Pre-scan requirements to ensure successful field work.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="site-1">
                        <AccordionTrigger>What is Site Readiness?</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground space-y-3">
                          <p><strong className="text-foreground">Purpose:</strong> Confirms the site is ready for scanning before the field team arrives.</p>
                          <p><strong className="text-foreground">Key checks include:</strong></p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li>Access confirmed (keys, badges, contacts)</li>
                            <li>Utilities on (lighting, HVAC)</li>
                            <li>Areas cleared of obstructions</li>
                            <li>Safety requirements met</li>
                          </ul>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="site-2">
                        <AccordionTrigger>Using the Checklist</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground space-y-3">
                          <p><strong className="text-foreground">Where to find it:</strong> Lead Details tab &gt; Site Readiness section</p>
                          <p><strong className="text-foreground">How to use:</strong></p>
                          <ol className="list-decimal pl-5 space-y-1">
                            <li>Review each question with the client</li>
                            <li>Mark items as confirmed or needing attention</li>
                            <li>Add notes for special instructions</li>
                            <li>Checklist transfers to project when deal closes</li>
                          </ol>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      The Truth Loop & Delivery
                    </CardTitle>
                    <CardDescription>How to execute the "Hard Gates" and Digital Twins.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible>
                      <AccordionItem value="item-1">
                        <AccordionTrigger>The Audit Gate (Variance Check)</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                          <p>Before modeling begins, you must enter the <strong className="text-foreground">Actual SQFT</strong> from the scan data. If the Variance is &gt;10%:</p>
                          <ol className="list-decimal pl-5 mt-2 space-y-1">
                            <li>The system will <strong className="text-foreground">Lock Delivery</strong> (Red Status).</li>
                            <li>A "Variance Alert" is sent to Sales (Marketing Opportunity).</li>
                            <li>You must clear the alert with the Client before proceeding.</li>
                          </ol>
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="item-2">
                        <AccordionTrigger>Generating the Web Viewer (Digital Twin)</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground space-y-2">
                          <p>To deliver a Digital Twin:</p>
                          <ol className="list-decimal pl-5 space-y-1">
                            <li>Go to <strong className="text-foreground">Production Tracker</strong></li>
                            <li>Find a project in QC, Modeling, or Delivered stage</li>
                            <li>Look for the "Digital Twin Viewer" section</li>
                            <li>Click <strong className="text-foreground">"Generate Point Cloud"</strong></li>
                            <li>Wait for processing (status updates automatically)</li>
                            <li>Click <strong className="text-foreground">"View Digital Twin"</strong> when ready</li>
                          </ol>
                          <p className="text-sm mt-2 border-t pt-2">Note: Project must have storage configured (Drive folder or GCS path) before conversion. Processing takes 5-15 minutes for real data.</p>
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="item-3">
                        <AccordionTrigger>Production Hard Gates</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                          <p>The system enforces workflow gates to protect project quality:</p>
                          <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li><strong className="text-foreground">Retainer Gate:</strong> Scanning can't start until retainer is paid</li>
                            <li><strong className="text-foreground">QC Gate:</strong> Delivery blocked if variance exceeds threshold</li>
                            <li><strong className="text-foreground">SQFT Audit Gate:</strong> Must verify actual vs. estimated before modeling</li>
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Real-Time Margin Tracking</CardTitle>
                    <CardDescription>Monitor project profitability as you work.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible>
                      <AccordionItem value="margin-1">
                        <AccordionTrigger>Understanding Margin Badges</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                          <p>Project cards display color-coded margin indicators:</p>
                          <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li><span className="text-green-600 font-medium">Green:</span> Healthy margin (&gt;30%)</li>
                            <li><span className="text-yellow-600 font-medium">Yellow:</span> At risk (15-30%)</li>
                            <li><span className="text-red-600 font-medium">Red:</span> Below threshold (&lt;15%)</li>
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                </Card>

                {/* FieldHub Mobile App */}
                <Card className="border-cyan-500/20 bg-cyan-500/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-cyan-500" />
                      FieldHub Mobile App
                      <Badge variant="secondary" className="ml-auto">New</Badge>
                    </CardTitle>
                    <CardDescription>Mobile-first interface for field technicians (PWA).</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="field-1">
                        <AccordionTrigger className="text-left">
                          <div className="flex items-center gap-2">
                            <Play className="h-4 w-4 text-cyan-500" />
                            Getting Started
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground space-y-3">
                          <p><strong className="text-foreground">Access:</strong> Navigate to <strong>/field</strong> on any device.</p>
                          <p><strong className="text-foreground">Mobile Detection:</strong> On phones and tablets, the UI automatically switches to the mobile-optimized layout with bottom navigation.</p>
                          <p><strong className="text-foreground">Bottom Tabs:</strong></p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Home:</strong> Mission overview + Quick Actions</li>
                            <li><strong>Time:</strong> Clock In/Out with GPS tracking</li>
                            <li><strong>Capture:</strong> Photo/video upload</li>
                            <li><strong>Chat:</strong> AI support</li>
                          </ul>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="field-2">
                        <AccordionTrigger className="text-left">
                          <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-amber-500" />
                            Quick Actions
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground space-y-3">
                          <p>Large, touch-friendly buttons on the Home tab:</p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Clock In/Out:</strong> One-tap status update with GPS capture</li>
                            <li><strong>Capture:</strong> Direct camera access for site photos</li>
                            <li><strong>Voice Note:</strong> Record → AI transcription → Field Notes</li>
                            <li><strong>Escalate:</strong> Immediate chat with AI support</li>
                          </ul>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="field-3">
                        <AccordionTrigger className="text-left">
                          <div className="flex items-center gap-2">
                            <Brain className="h-4 w-4 text-purple-500" />
                            Voice Notes (Whisper AI)
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground space-y-3">
                          <p><strong className="text-foreground">How it works:</strong></p>
                          <ol className="list-decimal pl-5 space-y-1">
                            <li>Tap <strong>Voice Note</strong> Quick Action</li>
                            <li>Press <strong>Record Voice Note</strong> and speak clearly</li>
                            <li>Tap <strong>Stop</strong> when finished</li>
                            <li>AI transcribes audio to text using OpenAI Whisper</li>
                            <li>Transcription appears in your Field Notes</li>
                          </ol>
                          <p className="text-sm mt-2 text-green-600 dark:text-green-400">Notes are saved locally until submitted in your Daily Report.</p>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="field-4">
                        <AccordionTrigger className="text-left">
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-green-500" />
                            GPS Time Tracking
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground space-y-3">
                          <p><strong className="text-foreground">What it captures:</strong></p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li>Clock In/Out timestamp</li>
                            <li>GPS coordinates (latitude/longitude)</li>
                            <li>Mission log entry with status update</li>
                          </ul>
                          <p><strong className="text-foreground">Requirements:</strong></p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li>Browser location permissions enabled</li>
                            <li>GPS signal (may be weak indoors)</li>
                          </ul>
                          <p className="text-sm mt-2 border-t pt-2">If geolocation fails, Clock In still works—location just won't be recorded.</p>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="strategy" className="space-y-4">
                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      The "Overrun Shield" Positioning
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">We do not sell "Laser Scanning." We sell <strong className="text-foreground">Risk Mitigation.</strong></p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div className="bg-card p-4 rounded-lg border">
                        <h4 className="font-bold mb-2">The Old Way</h4>
                        <p className="text-sm text-muted-foreground">"Here is your point cloud. Good luck."</p>
                      </div>
                      <div className="bg-card p-4 rounded-lg border-2 border-green-500">
                        <h4 className="font-bold mb-2">The S2P Way</h4>
                        <p className="text-sm text-muted-foreground">"We audited reality. You have a 12% variance. We fixed it before you poured concrete."</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>The 8 Buyer Personas</CardTitle>
                    <CardDescription>Know your audience, tailor your message.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3 bg-secondary/30 rounded-lg">
                        <p className="font-medium">BP1 - Engineer</p>
                        <p className="text-sm text-muted-foreground">Risk mitigation, coordination focus</p>
                      </div>
                      <div className="p-3 bg-secondary/30 rounded-lg">
                        <p className="font-medium">BP2 - General Contractor</p>
                        <p className="text-sm text-muted-foreground">Schedule, budget certainty</p>
                      </div>
                      <div className="p-3 bg-secondary/30 rounded-lg">
                        <p className="font-medium">BP3 - Subcontractor</p>
                        <p className="text-sm text-muted-foreground">Prefab accuracy, field efficiency</p>
                      </div>
                      <div className="p-3 bg-secondary/30 rounded-lg">
                        <p className="font-medium">BP4 - Surveyor</p>
                        <p className="text-sm text-muted-foreground">Precision, deliverable quality</p>
                      </div>
                      <div className="p-3 bg-secondary/30 rounded-lg">
                        <p className="font-medium">BP5 - Architect</p>
                        <p className="text-sm text-muted-foreground">Design intent, visualization</p>
                      </div>
                      <div className="p-3 bg-secondary/30 rounded-lg">
                        <p className="font-medium">BP6 - Developer</p>
                        <p className="text-sm text-muted-foreground">BOMA, revenue optimization</p>
                      </div>
                      <div className="p-3 bg-secondary/30 rounded-lg">
                        <p className="font-medium">BP7 - Facility Manager</p>
                        <p className="text-sm text-muted-foreground">Asset management, maintenance</p>
                      </div>
                      <div className="p-3 bg-secondary/30 rounded-lg">
                        <p className="font-medium">BP8 - Owner</p>
                        <p className="text-sm text-muted-foreground">ROI, long-term value</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Settings & Admin Tab */}
              <TabsContent value="settings" className="space-y-4">
                {/* Proposal Builder */}
                <Card className="border-purple-500/20 bg-purple-500/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Palette className="h-5 w-5 text-purple-500" />
                      Proposal Builder
                      <Badge variant="secondary" className="ml-auto">New</Badge>
                    </CardTitle>
                    <CardDescription>Create beautiful, customizable proposals for clients.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="proposal-1">
                        <AccordionTrigger className="text-left">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-purple-500" />
                            Opening the Proposal Builder
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground space-y-3">
                          <p><strong className="text-foreground">How to access:</strong></p>
                          <ol className="list-decimal pl-5 space-y-1">
                            <li>Open a deal from the Sales pipeline</li>
                            <li>Go to the <strong className="text-foreground">Proposal</strong> tab</li>
                            <li>Click <strong className="text-foreground">"Open Proposal Builder"</strong></li>
                          </ol>
                          <p className="text-sm text-purple-600 dark:text-purple-400">The builder opens in a split-pane view with sections on the left and live preview on the right.</p>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="proposal-2">
                        <AccordionTrigger className="text-left">
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-blue-500" />
                            Using Template Groups
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground space-y-3">
                          <p><strong className="text-foreground">What are template groups?</strong> Pre-configured sets of sections tailored for different proposal types.</p>
                          <p><strong className="text-foreground">Available groups:</strong></p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Standard:</strong> Full proposal with all sections</li>
                            <li><strong>Quick Quote:</strong> Minimal sections for fast turnaround</li>
                            <li><strong>Technical:</strong> Detailed specs for engineering clients</li>
                          </ul>
                          <p><strong className="text-foreground">How to switch:</strong> Use the dropdown at the top of the Sections panel.</p>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="proposal-3">
                        <AccordionTrigger className="text-left">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-green-500" />
                            Editing Sections
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground space-y-3">
                          <p><strong className="text-foreground">To edit a section:</strong></p>
                          <ol className="list-decimal pl-5 space-y-1">
                            <li>Click the three-dot menu on any section</li>
                            <li>Select <strong className="text-foreground">"Edit Section"</strong></li>
                            <li>Modify the title and content in the dialog</li>
                            <li>Click <strong className="text-foreground">"Save Changes"</strong></li>
                          </ol>
                          <p><strong className="text-foreground">Variable substitution:</strong> Use double braces like <code className="bg-muted px-1 rounded">{'{{client_name}}'}</code> to auto-fill client data.</p>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="proposal-4">
                        <AccordionTrigger className="text-left">
                          <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-amber-500" />
                            Downloading & Sending
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground space-y-3">
                          <p><strong className="text-foreground">Download as PDF:</strong> Click the <strong>Download</strong> button to save a PDF locally.</p>
                          <p><strong className="text-foreground">Send to client:</strong> Click <strong>Send</strong> to email the proposal directly (requires email configured).</p>
                          <p className="text-sm text-green-600 dark:text-green-400">Tip: The cover page automatically displays your logo and project title.</p>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                </Card>

                {/* CI/CD Integration */}
                <Card className="border-blue-500/20 bg-blue-500/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <GitBranch className="h-5 w-5 text-blue-500" />
                      Continuous Integration (CI)
                      <Badge variant="secondary" className="ml-auto">New</Badge>
                    </CardTitle>
                    <CardDescription>Run automated tests directly from the app.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="ci-1">
                        <AccordionTrigger className="text-left">
                          <div className="flex items-center gap-2">
                            <Settings className="h-4 w-4 text-blue-500" />
                            Setting Up GitHub Token
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground space-y-3">
                          <p><strong className="text-foreground">To enable CI triggers from the app:</strong></p>
                          <ol className="list-decimal pl-5 space-y-1">
                            <li>Go to <strong>GitHub → Settings → Developer Settings</strong></li>
                            <li>Click <strong>Personal Access Tokens → Tokens (classic)</strong></li>
                            <li>Create a new token with these scopes:
                              <ul className="list-disc pl-5 mt-1">
                                <li><code className="bg-muted px-1 rounded">repo</code> - Full repository access</li>
                                <li><code className="bg-muted px-1 rounded">workflow</code> - Trigger workflows</li>
                              </ul>
                            </li>
                            <li>Add to your environment: <code className="bg-muted px-1 rounded">GITHUB_TOKEN=ghp_your_token</code></li>
                          </ol>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="ci-2">
                        <AccordionTrigger className="text-left">
                          <div className="flex items-center gap-2">
                            <Play className="h-4 w-4 text-green-500" />
                            Running Tests
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground space-y-3">
                          <p><strong className="text-foreground">From the Settings page:</strong></p>
                          <ol className="list-decimal pl-5 space-y-1">
                            <li>Go to <strong className="text-foreground">Settings</strong></li>
                            <li>Find the <strong className="text-foreground">Continuous Integration</strong> card</li>
                            <li>Toggle <strong>Include E2E Tests</strong> on/off</li>
                            <li>Click <strong className="text-foreground">"Run Tests Now"</strong></li>
                          </ol>
                          <p><strong className="text-foreground">What runs:</strong></p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li><strong>TypeScript Check:</strong> ~30 seconds</li>
                            <li><strong>Unit Tests:</strong> 167 tests, ~60 seconds</li>
                            <li><strong>E2E Tests:</strong> Browser automation, ~2 minutes</li>
                          </ul>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="ci-3">
                        <AccordionTrigger className="text-left">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            Understanding Test Results
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground space-y-3">
                          <p><strong className="text-foreground">Status badges:</strong></p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li><span className="text-green-600 font-medium">Passed (Green):</span> All tests succeeded</li>
                            <li><span className="text-yellow-600 font-medium">Running (Yellow):</span> Tests in progress</li>
                            <li><span className="text-red-600 font-medium">Failed (Red):</span> Some tests failed</li>
                          </ul>
                          <p className="text-sm mt-2">Click the external link icon to view full details on GitHub.</p>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                </Card>

                {/* Keyboard Shortcuts */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      Keyboard Shortcuts
                    </CardTitle>
                    <CardDescription>Speed up your workflow with these shortcuts.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-2">
                      <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                        <span className="font-medium">Save lead/deal</span>
                        <code className="bg-muted px-2 py-1 rounded text-sm">⌘+S or Ctrl+S</code>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                        <span className="font-medium">Close modal/dialog</span>
                        <code className="bg-muted px-2 py-1 rounded text-sm">Escape</code>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                        <span className="font-medium">Navigate back</span>
                        <code className="bg-muted px-2 py-1 rounded text-sm">Alt+←</code>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Integrations Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Integration Setup
                    </CardTitle>
                    <CardDescription>Required environment variables for each integration.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="int-qbo">
                        <AccordionTrigger>QuickBooks Online</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground space-y-2">
                          <p><strong className="text-foreground">Required variables:</strong></p>
                          <ul className="list-disc pl-5 space-y-1 font-mono text-sm">
                            <li>QUICKBOOKS_CLIENT_ID</li>
                            <li>QUICKBOOKS_CLIENT_SECRET</li>
                            <li>QUICKBOOKS_REDIRECT_URI</li>
                          </ul>
                          <p className="text-sm mt-2">Get these from the Intuit Developer Portal.</p>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="int-pandadoc">
                        <AccordionTrigger>PandaDoc</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground space-y-2">
                          <p><strong className="text-foreground">Required:</strong></p>
                          <ul className="list-disc pl-5 space-y-1 font-mono text-sm">
                            <li>PANDADOC_API_KEY</li>
                          </ul>
                          <p className="text-sm mt-2">Create an API key in PandaDoc Settings → Integrations.</p>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="int-ghl">
                        <AccordionTrigger>GoHighLevel</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground space-y-2">
                          <p><strong className="text-foreground">Required:</strong></p>
                          <ul className="list-disc pl-5 space-y-1 font-mono text-sm">
                            <li>GHL_API_KEY</li>
                            <li>GHL_LOCATION_ID</li>
                          </ul>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="int-github">
                        <AccordionTrigger>GitHub CI</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground space-y-2">
                          <p><strong className="text-foreground">Required:</strong></p>
                          <ul className="list-disc pl-5 space-y-1 font-mono text-sm">
                            <li>GITHUB_TOKEN (with repo and workflow scopes)</li>
                          </ul>
                          <p className="text-sm mt-2">Used for triggering CI tests from Settings.</p>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="int-google">
                        <AccordionTrigger>Google APIs</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground space-y-2">
                          <p><strong className="text-foreground">Required for distance calculation:</strong></p>
                          <ul className="list-disc pl-5 space-y-1 font-mono text-sm">
                            <li>GOOGLE_MAPS_API_KEY</li>
                          </ul>
                          <p className="text-sm mt-2">Enable Distance Matrix API in Google Cloud Console.</p>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="faq" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Frequently Asked Questions
                    </CardTitle>
                    <CardDescription>Solutions to common issues.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="faq-1">
                        <AccordionTrigger>Why can't I save my quote?</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground space-y-3">
                          <p>Check the <strong className="text-foreground">Integrity Audit</strong> panel in the sidebar.</p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li><strong className="text-red-500">Red Shield:</strong> Blocking error. Usually means Gross Margin is below 40%. You need an Admin override.</li>
                            <li><strong className="text-amber-500">Yellow Shield:</strong> Warning only. Check if you selected a Building Type.</li>
                          </ul>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="faq-2">
                        <AccordionTrigger>Why is my Travel Cost $0?</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground space-y-3">
                          <p>Travel requires a valid <strong className="text-foreground">Project Address</strong> to calculate distance.</p>
                          <p>Go back to the <strong>Lead Details</strong> tab and ensure the address field is filled out correctly.</p>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="faq-3">
                        <AccordionTrigger>How do I sync Customers from QuickBooks?</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground space-y-3">
                          <p>Go to the <strong className="text-foreground">Customers</strong> page (in the sidebar) and click the <strong>"Sync from QuickBooks"</strong> button at the top right.</p>
                          <p>This will pull the latest client list, revenue figures, and balances.</p>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="faq-4">
                        <AccordionTrigger>How do I add a new team member?</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground space-y-3">
                          <p>User management is restricted to Admins (CEO role).</p>
                          <p>Go to <strong className="text-foreground">Settings &gt; Team</strong> to invite new users or manage permissions.</p>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="faq-5">
                        <AccordionTrigger>How do I access the FieldHub mobile app?</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground space-y-3">
                          <p><strong className="text-foreground">What it is:</strong> FieldHub is a mobile-first interface for field technicians.</p>
                          <p><strong className="text-foreground">How to access:</strong></p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li>Navigate to <strong>/field</strong> on any device</li>
                            <li>On mobile, the interface automatically switches to mobile-optimized layout</li>
                            <li>Bottom navigation: Home, Time, Capture, Chat</li>
                          </ul>
                          <p className="text-sm mt-2 text-green-600 dark:text-green-400">Tip: Add the page to your home screen for app-like experience.</p>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="faq-6">
                        <AccordionTrigger>What are the Quick Actions in FieldHub?</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground space-y-3">
                          <p><strong className="text-foreground">Quick Actions</strong> are large, touch-friendly buttons for common field tasks:</p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Clock In/Out:</strong> One-tap with GPS location capture</li>
                            <li><strong>Capture:</strong> Quick access to camera for site photos</li>
                            <li><strong>Voice Note:</strong> Record and transcribe voice memos</li>
                            <li><strong>Escalate:</strong> Immediately chat with AI support</li>
                          </ul>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="faq-7">
                        <AccordionTrigger>How do Voice Notes work?</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground space-y-3">
                          <p><strong className="text-foreground">AI-Powered Transcription:</strong> Voice Notes use OpenAI Whisper to convert speech to text.</p>
                          <p><strong className="text-foreground">How to use:</strong></p>
                          <ol className="list-decimal pl-5 space-y-1">
                            <li>Tap the <strong>Voice Note</strong> Quick Action</li>
                            <li>Press <strong>Record Voice Note</strong> and speak clearly</li>
                            <li>Tap <strong>Stop</strong> when finished</li>
                            <li>The transcribed text appears in your Field Notes</li>
                          </ol>
                          <p className="text-sm mt-2 border-t pt-2">Notes are saved locally and included in your Daily Report.</p>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="faq-8">
                        <AccordionTrigger>Why isn't my GPS location captured when I Clock In?</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground space-y-3">
                          <p><strong className="text-foreground">Common causes:</strong></p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li>Location permissions not granted in browser settings</li>
                            <li>GPS signal weak (indoors or in parking garage)</li>
                            <li>Browser privacy settings blocking geolocation</li>
                          </ul>
                          <p className="text-sm mt-2 text-amber-600 dark:text-amber-400">If geolocation fails, Clock In will still work—but location won't be recorded.</p>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}
