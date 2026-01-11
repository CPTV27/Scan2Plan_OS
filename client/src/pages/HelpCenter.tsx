import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Shield, Target, Zap, Brain, Calculator, FileSearch, TrendingUp, MessageSquare, FileText, Sparkles, AlertTriangle, Star, CheckCircle } from "lucide-react";
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
              <TabsList className="grid w-full grid-cols-4 mb-8">
                <TabsTrigger value="ai-tools" data-testid="tab-ai-tools" className="gap-1">
                  <Brain className="h-4 w-4" />
                  AI & Tools
                </TabsTrigger>
                <TabsTrigger value="sales" data-testid="tab-sales">Growth & Sales</TabsTrigger>
                <TabsTrigger value="ops" data-testid="tab-ops">Operations</TabsTrigger>
                <TabsTrigger value="strategy" data-testid="tab-strategy">The Strategy</TabsTrigger>
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
                            40% Gross Margin Floor (Hard Gate)
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground space-y-3">
                          <p><strong className="text-foreground">What it does:</strong> Blocks AI proposal generation if your quote's gross margin falls below 40%.</p>
                          <p><strong className="text-foreground">Why it matters:</strong> Protects profitability by preventing you from accidentally sending proposals that would lose money.</p>
                          <div className="bg-card p-3 rounded-lg border mt-2">
                            <p className="font-medium text-sm">How to fix if blocked:</p>
                            <ol className="list-decimal pl-5 mt-2 space-y-1 text-sm">
                              <li>Go to the Quote Builder tab in the deal workspace</li>
                              <li>Increase prices or reduce scope until margin is 40%+</li>
                              <li>For Tier A projects, adjust your scanning/modeling cost inputs</li>
                              <li>Once saved with valid margin, proposal generation unlocks</li>
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
                        <AccordionTrigger>Travel Pricing (Brooklyn-Based)</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground space-y-3">
                          <p><strong className="text-foreground">Dispatch from Brooklyn:</strong></p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li>Tier A (50K+ sqft): No base fee, $4/mile over 20 miles</li>
                            <li>Tier B (10K-49,999 sqft): $300 base + $4/mile over 20 miles</li>
                            <li>Tier C (&lt;10K sqft): $150 base + $4/mile over 20 miles</li>
                          </ul>
                          <p><strong className="text-foreground">Dispatch from Woodstock/Troy:</strong> Flat $3/mile (no base fee)</p>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="cpq-margin">
                        <AccordionTrigger>Margin Target Slider</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground space-y-3">
                          <p><strong className="text-foreground">What it does:</strong> Adjusts your target margin and automatically calculates the client price.</p>
                          <p><strong className="text-foreground">Range:</strong> 35% to 60%</p>
                          <p><strong className="text-foreground">How it works:</strong></p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li>Set your desired margin using the slider</li>
                            <li>System calculates: Client Price = Cost ÷ (1 - Margin)</li>
                            <li>Price updates automatically as you adjust</li>
                          </ul>
                          <p><strong className="text-foreground">Guardrails:</strong></p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li><span className="text-yellow-600 font-medium">45%:</span> Warning - below stretch goal</li>
                            <li><span className="text-red-600 font-medium">40%:</span> Hard floor - proposal generation blocked</li>
                          </ul>
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
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}
