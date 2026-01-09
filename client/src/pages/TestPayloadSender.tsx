import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Send, Copy, CheckCircle2, XCircle, Play, RotateCcw } from "lucide-react";

const TEST_SCENARIOS = {
  standardProject: {
    name: "Standard Office Project",
    description: "25k sqft office building with Architecture LoD 300",
    payload: {
      specificBuilding: "Main Office Building",
      typeOfBuilding: "5-story commercial office",
      interiorCadElevations: "15",
      bimDeliverable: ["Revit"],
      bimVersion: "Revit 2024",
      customTemplate: "no",
      aboveBelowACT: "both",
      actSqft: "5000",
      assumedGrossMargin: "45%",
      sqftAssumptions: "Measured from floor plans provided by client",
      source: "referral",
      sourceNote: "Referred by existing client",
      probabilityOfClosing: "75",
      projectStatus: "proposal",
      estimatedTimeline: "3weeks",
      paymentTerms: "standard",
      risks: [],
      accountContact: "John Smith",
      accountContactEmail: "john@acmecorp.com",
      accountContactPhone: "555-123-4567",
      areas: [
        {
          id: "1",
          name: "Main Building",
          kind: "standard",
          buildingType: "1",
          squareFeet: "25000",
          lod: "300",
          disciplines: ["architecture"],
          scope: "full",
        },
      ],
      travel: {
        dispatchLocation: "WOODSTOCK",
        distance: 45,
      },
    },
  },
  tierAProject: {
    name: "Tier A Large Project",
    description: "60k sqft warehouse - Tier A Brooklyn pricing with margin multiplier",
    payload: {
      specificBuilding: "Distribution Center A",
      typeOfBuilding: "Industrial warehouse",
      interiorCadElevations: "8",
      bimDeliverable: ["Revit", "Archicad"],
      bimVersion: "Revit 2024",
      customTemplate: "yes",
      aboveBelowACT: "below",
      actSqft: "0",
      assumedGrossMargin: "50%",
      sqftAssumptions: "Estimated from building footprint x floors",
      source: "partner",
      probabilityOfClosing: "60",
      projectStatus: "negotiation",
      estimatedTimeline: "6weeks",
      paymentTerms: "net60",
      risks: ["occupied"],
      accountContact: "Jane Doe",
      accountContactEmail: "jane@bigwarehouse.com",
      tierAScanningCost: "7000",
      tierAModelingCost: 5000,
      tierAMargin: "2.5",
      areas: [
        {
          id: "1",
          name: "Warehouse Floor",
          kind: "standard",
          buildingType: "9",
          squareFeet: "60000",
          lod: "200",
          disciplines: ["architecture", "structural"],
          scope: "full",
        },
      ],
      travel: {
        dispatchLocation: "BROOKLYN",
        distance: 15,
      },
    },
  },
  landscapeProject: {
    name: "Landscape Scanning Project",
    description: "5 acre natural landscape at LoD 300",
    payload: {
      specificBuilding: "Campus Grounds",
      typeOfBuilding: "University campus landscape",
      interiorCadElevations: "0",
      bimDeliverable: ["Sketchup"],
      bimVersion: "SketchUp 2024",
      customTemplate: "no",
      source: "website",
      probabilityOfClosing: "40",
      projectStatus: "proposal",
      estimatedTimeline: "2weeks",
      designProContact: "Mike Landscape",
      designProCompanyContact: "Green Design LLC",
      areas: [
        {
          id: "1",
          name: "Campus Grounds",
          kind: "landscape",
          buildingType: "landscape_natural",
          squareFeet: "5",
          lod: "300",
          disciplines: ["site"],
          scope: "full",
        },
      ],
      travel: {
        dispatchLocation: "WOODSTOCK",
        distance: 80,
      },
    },
  },
  mixedScopeProject: {
    name: "Mixed Scope Project",
    description: "Interior and exterior with different LoDs",
    payload: {
      specificBuilding: "Historic City Hall",
      typeOfBuilding: "Historic municipal building",
      interiorCadElevations: "25",
      bimDeliverable: ["Revit"],
      bimVersion: "Revit 2024",
      customTemplate: "other",
      customTemplateOther: "Client's historic preservation template",
      aboveBelowACT: "other",
      aboveBelowACTOther: "Only specific rooms have ACT",
      actSqft: "3000",
      assumedGrossMargin: "42%",
      insuranceRequirements: "$2M umbrella required for municipal work",
      caveatsProfitability: "Historic complexity may require additional site visits",
      source: "partner",
      sourceNote: "Referred by architecture partner",
      probabilityOfClosing: "80",
      projectStatus: "qualified",
      estimatedTimeline: "4weeks",
      timelineNotes: "City council meeting deadline in 5 weeks",
      proofLinks: "https://drive.google.com/historical-photos",
      areas: [
        {
          id: "1",
          name: "Historic Building",
          kind: "standard",
          buildingType: "3",
          squareFeet: "35000",
          lod: "300",
          disciplines: ["architecture", "structural", "mep"],
          scope: "mixed",
        },
      ],
      travel: {
        dispatchLocation: "BROOKLYN",
        distance: 25,
      },
    },
  },
  allFieldsTest: {
    name: "All Fields Test",
    description: "Tests core scoping fields",
    payload: {
      specificBuilding: "Test Building - All Fields",
      typeOfBuilding: "Commercial Mixed-Use",
      interiorCadElevations: "20",
      bimDeliverable: ["Revit", "Archicad", "Other"],
      bimDeliverableOther: "AutoCAD DWG",
      bimVersion: "Revit 2024",
      customTemplate: "other",
      customTemplateOther: "Custom MEP template from client",
      aboveBelowACT: "both",
      actSqft: "8000",
      sqftAssumptions: "Measured from architect drawings + field verification",
      assumedGrossMargin: "48%",
      caveatsProfitability: "Complex MEP routing may add time",
      insuranceRequirements: "$5M umbrella, additional insured rider",
      accountContact: "Primary Contact Name",
      accountContactEmail: "primary@client.com",
      accountContactPhone: "555-111-2222",
      designProContact: "Architect Name",
      designProCompanyContact: "Architecture Firm LLC",
      otherContact: "GC: BuildRight Inc, PM: Steve Jones 555-333-4444",
      proofLinks: "https://drive.google.com/folder1, https://box.com/folder2",
      source: "repeat",
      sourceNote: "Previous warehouse project in 2024",
      probabilityOfClosing: "90",
      projectStatus: "won",
      estimatedTimeline: "5weeks",
      timelineNotes: "Fast-track schedule, client priority",
      areas: [
        {
          id: "1",
          name: "Retail Ground Floor",
          kind: "standard",
          buildingType: "2",
          squareFeet: "15000",
          lod: "300",
          disciplines: ["architecture", "mep"],
          scope: "interior",
        },
        {
          id: "2",
          name: "Office Floors 2-5",
          kind: "standard",
          buildingType: "1",
          squareFeet: "50000",
          lod: "200",
          disciplines: ["architecture", "structural", "mep"],
          scope: "full",
        },
        {
          id: "3",
          name: "Parking Lot",
          kind: "landscape",
          buildingType: "landscape_built",
          squareFeet: "2",
          lod: "200",
          disciplines: ["site"],
          scope: "full",
        },
      ],
      travel: {
        dispatchLocation: "BROOKLYN",
        distance: 35,
      },
    },
  },
};

export default function TestPayloadSender() {
  const { toast } = useToast();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [selectedScenario, setSelectedScenario] = useState<string>("standardProject");
  const [customPayload, setCustomPayload] = useState<string>("");
  const [targetUrl, setTargetUrl] = useState<string>("/sales/calculator");
  const [sentPayloads, setSentPayloads] = useState<Array<{ time: string; scenario: string; success: boolean }>>([]);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  const sendPayload = (payload: any, scenarioName: string) => {
    if (!iframeRef.current?.contentWindow) {
      toast({
        title: "Error",
        description: "CPQ Calculator iframe not loaded yet. Please wait.",
        variant: "destructive",
      });
      return;
    }

    const message = {
      type: "CPQ_SCOPING_PAYLOAD",
      payload,
    };

    try {
      iframeRef.current.contentWindow.postMessage(message, window.location.origin);
      
      const logEntry = {
        time: new Date().toLocaleTimeString(),
        scenario: scenarioName,
        success: true,
      };
      setSentPayloads((prev) => [logEntry, ...prev.slice(0, 9)]);
      
      toast({
        title: "Payload Sent",
        description: `${scenarioName} payload sent to CPQ Calculator`,
      });
    } catch (error) {
      const logEntry = {
        time: new Date().toLocaleTimeString(),
        scenario: scenarioName,
        success: false,
      };
      setSentPayloads((prev) => [logEntry, ...prev.slice(0, 9)]);
      
      toast({
        title: "Error",
        description: "Failed to send payload",
        variant: "destructive",
      });
    }
  };

  const handleSendPreset = () => {
    const scenario = TEST_SCENARIOS[selectedScenario as keyof typeof TEST_SCENARIOS];
    if (scenario) {
      sendPayload(scenario.payload, scenario.name);
    }
  };

  const handleSendCustom = () => {
    try {
      const parsed = JSON.parse(customPayload);
      sendPayload(parsed, "Custom Payload");
    } catch (error) {
      toast({
        title: "Invalid JSON",
        description: "Please enter valid JSON for the custom payload",
        variant: "destructive",
      });
    }
  };

  const copyPayloadToClipboard = () => {
    const scenario = TEST_SCENARIOS[selectedScenario as keyof typeof TEST_SCENARIOS];
    if (scenario) {
      navigator.clipboard.writeText(JSON.stringify(scenario.payload, null, 2));
      toast({
        title: "Copied",
        description: "Payload copied to clipboard",
      });
    }
  };

  const reloadIframe = () => {
    if (iframeRef.current) {
      setIframeLoaded(false);
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <div className="w-[450px] border-r flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold">CPQ Test Payload Sender</h1>
          <p className="text-sm text-muted-foreground">
            Simulate CRM postMessage integration
          </p>
        </div>

        <ScrollArea className="flex-1 p-4">
          <Tabs defaultValue="presets">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="presets" className="flex-1">Preset Scenarios</TabsTrigger>
              <TabsTrigger value="custom" className="flex-1">Custom Payload</TabsTrigger>
            </TabsList>

            <TabsContent value="presets" className="space-y-4">
              <div className="space-y-2">
                <Label>Select Test Scenario</Label>
                <Select value={selectedScenario} onValueChange={setSelectedScenario}>
                  <SelectTrigger data-testid="select-test-scenario">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TEST_SCENARIOS).map(([key, scenario]) => (
                      <SelectItem key={key} value={key}>
                        {scenario.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedScenario && TEST_SCENARIOS[selectedScenario as keyof typeof TEST_SCENARIOS] && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      {TEST_SCENARIOS[selectedScenario as keyof typeof TEST_SCENARIOS].name}
                    </CardTitle>
                    <CardDescription>
                      {TEST_SCENARIOS[selectedScenario as keyof typeof TEST_SCENARIOS].description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[200px]">
                      <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                        {JSON.stringify(
                          TEST_SCENARIOS[selectedScenario as keyof typeof TEST_SCENARIOS].payload,
                          null,
                          2
                        )}
                      </pre>
                    </ScrollArea>
                    <div className="flex gap-2 mt-3">
                      <Button 
                        onClick={handleSendPreset} 
                        className="flex-1"
                        disabled={!iframeLoaded}
                        data-testid="button-send-preset"
                      >
                        <Send className="mr-2 h-4 w-4" />
                        Send Payload
                      </Button>
                      <Button variant="outline" onClick={copyPayloadToClipboard}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="custom" className="space-y-4">
              <div className="space-y-2">
                <Label>Custom JSON Payload</Label>
                <Textarea
                  value={customPayload}
                  onChange={(e) => setCustomPayload(e.target.value)}
                  placeholder='{"specificBuilding": "Test", ...}'
                  className="h-[300px] font-mono text-xs"
                  data-testid="textarea-custom-payload"
                />
              </div>
              <Button 
                onClick={handleSendCustom} 
                className="w-full"
                disabled={!iframeLoaded}
                data-testid="button-send-custom"
              >
                <Send className="mr-2 h-4 w-4" />
                Send Custom Payload
              </Button>
            </TabsContent>
          </Tabs>

          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <Label>Send Log</Label>
              <Badge variant={iframeLoaded ? "default" : "secondary"}>
                {iframeLoaded ? "Connected" : "Loading..."}
              </Badge>
            </div>
            <div className="space-y-1">
              {sentPayloads.length === 0 ? (
                <p className="text-xs text-muted-foreground">No payloads sent yet</p>
              ) : (
                sentPayloads.map((log, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-xs p-2 rounded bg-muted"
                  >
                    {log.success ? (
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-500" />
                    )}
                    <span className="text-muted-foreground">{log.time}</span>
                    <span className="truncate">{log.scenario}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </ScrollArea>

        <div className="p-4 border-t space-y-3">
          <div className="space-y-2">
            <Label>Target URL</Label>
            <div className="flex gap-2">
              <Input
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="/sales/calculator"
                data-testid="input-target-url"
              />
              <Button variant="outline" size="icon" onClick={reloadIframe}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="p-2 border-b bg-muted/30 flex items-center gap-2">
          <Play className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">CPQ Calculator Preview</span>
        </div>
        <iframe
          ref={iframeRef}
          src={targetUrl}
          className="flex-1 w-full border-0"
          onLoad={() => setIframeLoaded(true)}
          title="CPQ Calculator"
        />
      </div>
    </div>
  );
}
