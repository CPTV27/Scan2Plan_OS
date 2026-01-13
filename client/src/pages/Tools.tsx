import { useState, useRef, useEffect } from "react";
import { Sidebar, MobileHeader } from "@/components/Sidebar";
import { useLeads, useCreateLead } from "@/hooks/use-leads";
import { useProjects } from "@/hooks/use-projects";
import { useCreateFieldNote, useProcessFieldNote } from "@/hooks/use-field-notes";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Loader2, Copy, Mic, Upload, FileAudio, Plus, Building2, Square, Circle, ExternalLink } from "lucide-react";
import { Label } from "@/components/ui/label";
import { clsx } from "clsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Tools() {
  const { data: leads } = useLeads();
  const { data: projects } = useProjects();
  const createNote = useCreateFieldNote();
  const processNote = useProcessFieldNote();
  const createLead = useCreateLead();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [rawContent, setRawContent] = useState("");
  const [selectedLead, setSelectedLead] = useState<string>("");
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [generatedScope, setGeneratedScope] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isNewDeal, setIsNewDeal] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newProjectAddress, setNewProjectAddress] = useState("");
  
  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isRecording]);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `recording-${Date.now()}.webm`, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        handleAudioUpload(audioFile);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      toast({ title: "Recording Started", description: "Speak clearly into your microphone." });
    } catch (error) {
      toast({ 
        title: "Microphone Access Denied", 
        description: "Please allow microphone access to record audio.",
        variant: "destructive" 
      });
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  async function handleAudioUpload(file: File) {
    setAudioFile(file);
    setIsTranscribing(true);
    
    try {
      const formData = new FormData();
      formData.append("audio", file);

      const response = await fetch("/api/field-notes/transcribe", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) throw new Error("Transcription failed");

      const data = await response.json();
      setRawContent(data.transcript);
      toast({ title: "Transcribed", description: "Audio converted to text successfully." });
    } catch (error) {
      toast({ 
        title: "Transcription Failed", 
        description: "Could not process audio file. Try again or enter text manually.",
        variant: "destructive" 
      });
    } finally {
      setIsTranscribing(false);
    }
  }

  async function handleProcess() {
    if (!rawContent) return;
    
    let leadId: number;
    
    if (isNewDeal) {
      if (!newClientName.trim()) {
        toast({ 
          title: "Client Required", 
          description: "Please enter a client name to create a new deal.", 
          variant: "destructive" 
        });
        return;
      }
      
      try {
        const newLead = await createLead.mutateAsync({
          clientName: newClientName.trim(),
          projectAddress: newProjectAddress.trim() || "TBD",
          value: 0,
          dealStage: "Leads",
          probability: 10,
          leadPriority: 3,
        });
        leadId = newLead.id;
        toast({ title: "Deal Created", description: `New deal for ${newClientName} created.` });
      } catch {
        toast({ 
          title: "Error", 
          description: "Failed to create new deal.", 
          variant: "destructive" 
        });
        return;
      }
    } else {
      if (!selectedLead) {
        toast({ 
          title: "Deal Required", 
          description: "Please select a deal or create a new one.", 
          variant: "destructive" 
        });
        return;
      }
      leadId = parseInt(selectedLead);
    }
    
    try {
      const note = await createNote.mutateAsync({
        rawContent,
        leadId,
        projectId: selectedProject ? parseInt(selectedProject) : undefined,
      });

      const result = await processNote.mutateAsync(note.id) as { 
        processedScope?: string; 
        leadUpdated?: boolean; 
        extractedFields?: string[] 
      };
      
      setGeneratedScope(result.processedScope || "No scope generated. Try again.");
      
      if (result.leadUpdated && result.extractedFields?.length) {
        toast({ 
          title: "Scope Extracted", 
          description: `Updated deal with: ${result.extractedFields.length} fields extracted` 
        });
      } else if (result.processedScope) {
        toast({ 
          title: "Scope Generated", 
          description: "AI processed your meeting notes. Note: Could not auto-update deal fields." 
        });
      }
      
      if (isNewDeal) {
        setIsNewDeal(false);
        setNewClientName("");
        setNewProjectAddress("");
        setSelectedLead(leadId.toString());
      }
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to process notes. Please try again.", 
        variant: "destructive" 
      });
    }
  }

  const isProcessing = createNote.isPending || processNote.isPending || createLead.isPending;

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
        <MobileHeader />
        <main className="flex-1 p-4 md:p-8 overflow-auto">
          <header className="mb-8 max-w-4xl mx-auto">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-3xl font-display font-bold flex items-center gap-3">
                  <Mic className="w-8 h-8 text-accent" />
                  Meeting Scoping
                </h2>
                <p className="text-muted-foreground mt-2 text-lg">
                  Record client meetings and let AI extract scoping details for your quotes.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => window.open('https://cpq.scan2plan.dev', '_blank')}
                data-testid="button-open-cpq"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open CPQ Tool
              </Button>
            </div>
          </header>

        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="border-border shadow-lg">
            <CardHeader>
              <CardTitle>Client Meeting Recording</CardTitle>
              <CardDescription>Upload a meeting recording or type notes. AI will extract scoping details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label className="flex items-center gap-1">
                  Link to Deal
                  <span className="text-destructive">*</span>
                </Label>
                
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={!isNewDeal ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsNewDeal(false)}
                    className="flex-1"
                    data-testid="button-existing-deal"
                  >
                    <Building2 className="w-4 h-4 mr-2" />
                    Existing Deal
                  </Button>
                  <Button
                    type="button"
                    variant={isNewDeal ? "default" : "outline"}
                    size="sm"
                    onClick={() => { setIsNewDeal(true); setSelectedLead(""); }}
                    className="flex-1"
                    data-testid="button-new-deal"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Deal
                  </Button>
                </div>

                {isNewDeal ? (
                  <div className="space-y-3 p-3 rounded-lg bg-secondary/30 border border-border">
                    <div className="space-y-1">
                      <Label className="text-xs flex items-center gap-1">
                        Client Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        placeholder="Enter client/company name..."
                        value={newClientName}
                        onChange={(e) => setNewClientName(e.target.value)}
                        data-testid="input-new-client-name"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Project Address (optional)</Label>
                      <Input
                        placeholder="Enter project address..."
                        value={newProjectAddress}
                        onChange={(e) => setNewProjectAddress(e.target.value)}
                        data-testid="input-new-project-address"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">A new deal will be created and populated with scoping details.</p>
                  </div>
                ) : (
                  <>
                    <Select value={selectedLead} onValueChange={setSelectedLead}>
                      <SelectTrigger data-testid="select-deal">
                        <SelectValue placeholder="Select a deal to update..." />
                      </SelectTrigger>
                      <SelectContent>
                        {leads?.map(l => (
                          <SelectItem key={l.id} value={l.id.toString()}>
                            {l.clientName} - {l.projectAddress}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">AI-extracted details will update this deal's scoping fields.</p>
                  </>
                )}
              </div>

              <div className="space-y-2">
                <Label>Link to Project (Optional)</Label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project..." />
                  </SelectTrigger>
                  <SelectContent>
                    {projects?.map(p => (
                      <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Tabs defaultValue="text" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="text">Type Notes</TabsTrigger>
                  <TabsTrigger value="audio">Upload Audio</TabsTrigger>
                </TabsList>
                
                <TabsContent value="text" className="space-y-4 mt-4">
                  <Textarea 
                    placeholder="Client mentioned they need scanning for a 50,000 sqft warehouse. They want exterior only, focusing on the facade for renovation planning. Deliverable would be Revit at LOD 300. Timeline is tight - 2 weeks. Building type is industrial/warehouse."
                    className="min-h-[200px] font-mono text-sm leading-relaxed resize-none bg-secondary/20"
                    value={rawContent}
                    onChange={(e) => setRawContent(e.target.value)}
                    data-testid="textarea-meeting-notes"
                  />
                </TabsContent>
                
                <TabsContent value="audio" className="space-y-4 mt-4">
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    accept="audio/*,video/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleAudioUpload(file);
                    }}
                  />
                  
                  <div 
                    className={clsx(
                      "border-2 border-dashed rounded-xl p-8 text-center transition-all",
                      isRecording ? "border-red-500 bg-red-500/5" : isTranscribing ? "border-accent bg-accent/5" : "border-border"
                    )}
                  >
                    {isRecording ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="relative">
                          <div className="bg-red-500/20 p-4 rounded-full animate-pulse">
                            <Mic className="w-8 h-8 text-red-500" />
                          </div>
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                        </div>
                        <p className="font-medium text-red-500">Recording... {formatTime(recordingTime)}</p>
                        <p className="text-sm text-muted-foreground">Speak clearly into your microphone</p>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          className="mt-2"
                          onClick={stopRecording}
                          data-testid="button-stop-recording"
                        >
                          <Square className="w-4 h-4 mr-2" /> Stop Recording
                        </Button>
                      </div>
                    ) : isTranscribing ? (
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-10 h-10 text-accent animate-spin" />
                        <p className="text-muted-foreground">Transcribing audio with Whisper AI...</p>
                      </div>
                    ) : audioFile ? (
                      <div className="flex flex-col items-center gap-3">
                        <FileAudio className="w-10 h-10 text-accent" />
                        <p className="font-medium">{audioFile.name}</p>
                        <p className="text-sm text-muted-foreground">Audio ready for transcription</p>
                        <div className="flex gap-2 mt-2">
                          <Button variant="outline" size="sm" onClick={startRecording} data-testid="button-record-again">
                            <Mic className="w-4 h-4 mr-2" /> Record Again
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                            <Upload className="w-4 h-4 mr-2" /> Upload Different
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <div className="bg-accent/10 p-4 rounded-full">
                          <Mic className="w-8 h-8 text-accent" />
                        </div>
                        <div>
                          <p className="font-medium">Record or Upload Audio</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Use your microphone to record, or upload an audio/video file
                          </p>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Button 
                            variant="default" 
                            size="sm" 
                            onClick={startRecording}
                            data-testid="button-record-audio"
                          >
                            <Circle className="w-4 h-4 mr-2 text-red-400" /> Record
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => fileInputRef.current?.click()}
                            data-testid="button-upload-audio"
                          >
                            <Upload className="w-4 h-4 mr-2" /> Upload File
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {rawContent && (
                    <div className="space-y-2">
                      <Label>Transcribed Text (editable)</Label>
                      <Textarea 
                        className="min-h-[120px] font-mono text-sm bg-secondary/20"
                        value={rawContent}
                        onChange={(e) => setRawContent(e.target.value)}
                      />
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <Button 
                className="w-full bg-accent text-white shadow-lg shadow-accent/20"
                size="lg"
                disabled={!rawContent || (!isNewDeal && !selectedLead) || (isNewDeal && !newClientName.trim()) || isProcessing}
                onClick={handleProcess}
                data-testid="button-extract-scope"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Extracting Scope...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Extract Scoping Details
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className={clsx(
              "h-full border-border transition-all duration-500",
              generatedScope ? "shadow-xl shadow-accent/10 border-accent/20" : "opacity-50 border-dashed"
            )}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <div>
                  <CardTitle>Extracted Scope</CardTitle>
                  <CardDescription>AI-identified scoping details from your meeting</CardDescription>
                </div>
                {generatedScope && (
                  <Button variant="ghost" size="icon" onClick={() => {
                    navigator.clipboard.writeText(generatedScope);
                    toast({ title: "Copied", description: "Copied to clipboard" });
                  }} data-testid="button-copy-scope">
                    <Copy className="w-4 h-4" />
                  </Button>
                )}
              </CardHeader>
              <CardContent className="pt-6">
                {generatedScope ? (
                  <div className="bg-black/30 rounded-lg p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap min-h-[400px] border border-white/5 animate-in fade-in duration-500">
                    {generatedScope}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-12 text-center min-h-[400px]">
                    <Mic className="w-12 h-12 mb-4 opacity-20" />
                    <p>Record or type your client meeting notes, then extract scoping details for your quote.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          </div>
        </main>
      </div>
    </div>
  );
}
