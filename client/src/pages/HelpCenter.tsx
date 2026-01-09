import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BookOpen, Shield, Target, Zap } from "lucide-react";
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

            <Tabs defaultValue="sales" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-8">
                <TabsTrigger value="sales" data-testid="tab-sales">Growth & Sales</TabsTrigger>
                <TabsTrigger value="ops" data-testid="tab-ops">Operations</TabsTrigger>
                <TabsTrigger value="strategy" data-testid="tab-strategy">The Strategy</TabsTrigger>
              </TabsList>

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

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      Smart Proposal Engine
                    </CardTitle>
                    <CardDescription>Create personalized proposals that win.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible>
                      <AccordionItem value="proposal-1">
                        <AccordionTrigger>Using Case Study Matching</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                          <p>The proposal builder automatically matches case studies based on the buyer persona you selected. Navigate to <strong className="text-foreground">Deals &gt; Proposal</strong> to generate a tailored proposal with relevant success stories.</p>
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="proposal-2">
                        <AccordionTrigger>GoHighLevel Sync</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                          <p>All leads with personas are automatically synced to GoHighLevel with proper tags. Use <strong className="text-foreground">CRM &gt; Sync to GHL</strong> for batch updates.</p>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="ops" className="space-y-4">
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
