import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Project, TimeLog, Expense, MissionLog } from "@shared/schema";
import { FIELD_EXPENSE_CATEGORIES } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { 
  Play, 
  Square, 
  Mic,
  MicOff,
  MapPin,
  Building2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Send,
  AlertTriangle,
  User,
  Bot,
  PhoneCall,
  HelpCircle,
  FileText,
  Video,
  Settings,
  Wrench,
  DollarSign,
  Plus,
  Receipt,
  Car,
  Clock,
  Home,
  Pencil,
  Check,
  Navigation,
  FileDown,
  Upload,
  X,
  FolderOpen,
  CheckCircle2
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";

type TabType = "mission" | "support" | "profile";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  escalated?: boolean;
}

interface MissionProject extends Project {
  lead?: {
    clientName: string;
    projectName: string;
    projectAddress: string;
    buildingType: string;
    sqft: number;
    scope: string;
    disciplines: string;
    bimDeliverable: string;
    notes: string;
    contactName: string;
    contactPhone: string;
    cpqAreas?: Array<{
      id: string;
      name: string;
      disciplines: string[];
      disciplineLods?: Record<string, string>;
    }>;
  } | null;
}

interface ScopeChecklistItem {
  id: string;
  label: string;
  category: string;
  completed: boolean;
}

// Generate dynamic scope checklist based on project disciplines
function generateScopeChecklist(disciplines: string, lod?: string): ScopeChecklistItem[] {
  const items: ScopeChecklistItem[] = [];
  const disciplinesLower = disciplines?.toLowerCase() || "";
  const lodLevel = lod || "LOD 300";
  
  // Always add baseline scan requirements
  items.push({
    id: "baseline-1",
    label: "Complete full coverage scan of all accessible areas",
    category: "Baseline",
    completed: false,
  });
  items.push({
    id: "baseline-2",
    label: "Verify scan registration quality (RMS < 6mm)",
    category: "Baseline",
    completed: false,
  });
  
  // Mechanical/HVAC discipline
  if (disciplinesLower.includes("mech") || disciplinesLower.includes("hvac") || disciplinesLower.includes("mep")) {
    items.push({
      id: "mech-1",
      label: "Capture all HVAC nameplates and equipment tags",
      category: "Mechanical",
      completed: false,
    });
    items.push({
      id: "mech-2",
      label: "Detail MEP overhead routing and supports",
      category: "Mechanical",
      completed: false,
    });
  }
  
  // Electrical discipline
  if (disciplinesLower.includes("elec") || disciplinesLower.includes("mep")) {
    items.push({
      id: "elec-1",
      label: "Detail all panel schedules and transformer tags",
      category: "Electrical",
      completed: false,
    });
    items.push({
      id: "elec-2",
      label: "Capture conduit routing above accessible ceilings",
      category: "Electrical",
      completed: false,
    });
  }
  
  // Plumbing discipline
  if (disciplinesLower.includes("plumb") || disciplinesLower.includes("mep")) {
    items.push({
      id: "plumb-1",
      label: "Document pipe sizing and material where visible",
      category: "Plumbing",
      completed: false,
    });
  }
  
  // Structural discipline
  if (disciplinesLower.includes("struct")) {
    items.push({
      id: "struct-1",
      label: "Capture structural grid and column locations",
      category: "Structural",
      completed: false,
    });
    items.push({
      id: "struct-2",
      label: "Document beam depths and slab conditions",
      category: "Structural",
      completed: false,
    });
  }
  
  // LOD 350+ requirements
  if (lodLevel.includes("350") || lodLevel.includes("400")) {
    items.push({
      id: "lod350-1",
      label: "Verify hanger locations and secondary supports",
      category: "LOD 350",
      completed: false,
    });
    items.push({
      id: "lod350-2",
      label: "Document connection details at intersections",
      category: "LOD 350",
      completed: false,
    });
  }
  
  // Architecture (always included)
  if (disciplinesLower.includes("arch") || items.length < 5) {
    items.push({
      id: "arch-1",
      label: "Capture all door and window dimensions",
      category: "Architecture",
      completed: false,
    });
    items.push({
      id: "arch-2",
      label: "Document ceiling heights and floor transitions",
      category: "Architecture",
      completed: false,
    });
  }
  
  // Required items (always included)
  items.push({
    id: "required-video",
    label: "Video Walkthrough Uploaded",
    category: "Required",
    completed: false,
  });
  items.push({
    id: "required-boma",
    label: "BOMA Site Baseline Verified",
    category: "Required",
    completed: false,
  });
  
  return items;
}

interface FieldHubProps {
  missionId?: string;
}

const LOCAL_STORAGE_KEY = "fieldHub_draft";
const LOCAL_STORAGE_CHECKLIST_PREFIX = "fieldHub_checklist_";

// TimestampButton component for four-point logistics tracker
interface TimestampButtonProps {
  label: string;
  icon: React.ReactNode;
  timestamp: Date | null;
  isManual: boolean | null;
  field: string;
  missionLogId: number;
  updateMutation: any;
  editingTimestamp: string | null;
  setEditingTimestamp: (field: string | null) => void;
  manualTimeValue: string;
  setManualTimeValue: (value: string) => void;
  disabled: boolean;
  previousTimestamp?: Date | null;
  nextTimestamp?: Date | null;
  showToast?: (opts: { title: string; description?: string; variant?: "default" | "destructive" }) => void;
}

function TimestampButton({
  label,
  icon,
  timestamp,
  isManual,
  field,
  missionLogId,
  updateMutation,
  editingTimestamp,
  setEditingTimestamp,
  manualTimeValue,
  setManualTimeValue,
  disabled,
  previousTimestamp,
  nextTimestamp,
  showToast,
}: TimestampButtonProps) {
  const isEditing = editingTimestamp === field;
  
  const handleTap = () => {
    if (timestamp) return; // Already recorded
    updateMutation.mutate({ missionLogId, field, manual: false });
  };
  
  const handleManualSave = () => {
    if (!manualTimeValue) return;
    
    // Build date from time input
    const manualDate = new Date();
    const [hours, minutes] = manualTimeValue.split(":").map(Number);
    manualDate.setHours(hours, minutes, 0, 0);
    
    // Validate time is after previous timestamp
    if (previousTimestamp && manualDate <= new Date(previousTimestamp)) {
      showToast?.({ title: "Invalid Time", description: "Time must be after the previous step", variant: "destructive" });
      return;
    }
    
    // Validate time is before next timestamp (if one exists)
    if (nextTimestamp && manualDate >= new Date(nextTimestamp)) {
      showToast?.({ title: "Invalid Time", description: "Time must be before the next step", variant: "destructive" });
      return;
    }
    
    updateMutation.mutate({ 
      missionLogId, 
      field, 
      time: manualDate.toISOString(),
      manual: true 
    });
  };
  
  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          type="time"
          value={manualTimeValue}
          onChange={(e) => setManualTimeValue(e.target.value)}
          className="flex-1"
          data-testid={`input-manual-time-${field}`}
        />
        <Button
          size="icon"
          onClick={handleManualSave}
          disabled={!manualTimeValue || updateMutation.isPending}
          data-testid={`button-save-time-${field}`}
        >
          <Check className="w-4 h-4" />
        </Button>
      </div>
    );
  }
  
  if (timestamp) {
    return (
      <div className="flex items-center justify-between gap-1 px-3 py-2 rounded-md bg-green-500/10 border border-green-500/30">
        <div className="flex items-center gap-2">
          {icon}
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="text-sm font-mono text-green-600 dark:text-green-400">
              {format(new Date(timestamp), "h:mm a")}
            </span>
          </div>
        </div>
        {isManual && (
          <Badge variant="outline" className="text-xs">Manual</Badge>
        )}
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={() => {
            setManualTimeValue(format(new Date(timestamp), "HH:mm"));
            setEditingTimestamp(field);
          }}
          data-testid={`button-edit-time-${field}`}
        >
          <Pencil className="w-3 h-3" />
        </Button>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-1">
      <Button
        variant={disabled ? "outline" : "default"}
        className="flex-1"
        onClick={handleTap}
        disabled={disabled || updateMutation.isPending}
        data-testid={`button-${field}`}
      >
        {icon}
        <span className="ml-2">{label}</span>
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={() => setEditingTimestamp(field)}
        disabled={disabled}
        data-testid={`button-manual-${field}`}
      >
        <Pencil className="w-4 h-4" />
      </Button>
    </div>
  );
}

interface DraftData {
  notes: string;
  projectId: number | null;
  checklistState?: Record<string, boolean>;
}

function loadDraft(): DraftData {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    return saved ? JSON.parse(saved) : { notes: "", projectId: null, checklistState: {} };
  } catch {
    return { notes: "", projectId: null, checklistState: {} };
  }
}

function saveDraft(data: DraftData) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage not available
  }
}

// Per-project checklist state storage
function loadChecklistState(projectId: number | null): Record<string, boolean> {
  if (!projectId) return {};
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_CHECKLIST_PREFIX + projectId);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function saveChecklistState(projectId: number | null, state: Record<string, boolean>) {
  if (!projectId) return;
  try {
    localStorage.setItem(LOCAL_STORAGE_CHECKLIST_PREFIX + projectId, JSON.stringify(state));
  } catch {
    // localStorage not available
  }
}

export default function FieldHub({ missionId }: FieldHubProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("mission");
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  // Mission log state (four-point logistics tracker)
  const [editingTimestamp, setEditingTimestamp] = useState<string | null>(null);
  const [manualTimeValue, setManualTimeValue] = useState<string>("");
  
  // Expense entry state
  const [expenseCategory, setExpenseCategory] = useState<string>("");
  const [expenseAmount, setExpenseAmount] = useState<string>("");
  const [expenseVendor, setExpenseVendor] = useState<string>("");
  const [expenseDescription, setExpenseDescription] = useState<string>("");
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  
  // Notes state with localStorage persistence
  const [notes, setNotes] = useState(() => loadDraft().notes);
  
  // Scope checklist state (per-project scoped)
  const [scopeChecklist, setScopeChecklist] = useState<ScopeChecklistItem[]>([]);
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>({});
  
  // Offline status
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  
  // Data Handover state (multi-file upload)
  interface HandoverFile {
    file: File;
    areaDescription: string;
    preview?: string;
  }
  const [handoverFiles, setHandoverFiles] = useState<HandoverFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [handoverComplete, setHandoverComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch mission by UPID (deep-link)
  const { data: mission, isLoading: missionLoading } = useQuery<MissionProject>({
    queryKey: ["/api/projects/by-upid", missionId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/by-upid/${missionId}`, { credentials: "include" });
      if (!response.ok) throw new Error("Mission not found");
      return response.json();
    },
    enabled: !!missionId,
  });

  // Fetch all projects for fallback (when no missionId)
  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    enabled: !missionId,
  });

  // Get today's assigned project for production users
  const fallbackProject = projects.find(p => 
    p.status === "Scanning" || p.status === "Scheduling"
  );

  // Fetch lead data for fallback project (when no deep-link)
  const { data: fallbackMission } = useQuery<MissionProject>({
    queryKey: ["/api/projects/by-upid", fallbackProject?.universalProjectId],
    queryFn: async () => {
      // If project has universalProjectId, use the enriched endpoint
      if (fallbackProject?.universalProjectId) {
        const response = await fetch(`/api/projects/by-upid/${fallbackProject.universalProjectId}`, { credentials: "include" });
        if (response.ok) return response.json();
      }
      // Otherwise fetch lead data directly if leadId exists
      if (fallbackProject?.leadId) {
        const leadResponse = await fetch(`/api/leads/${fallbackProject.leadId}`, { credentials: "include" });
        if (leadResponse.ok) {
          const lead = await leadResponse.json();
          return {
            ...fallbackProject,
            lead: {
              clientName: lead.clientName,
              projectName: lead.projectName,
              projectAddress: lead.projectAddress,
              buildingType: lead.buildingType,
              sqft: lead.sqft,
              scope: lead.scope,
              disciplines: lead.disciplines,
              bimDeliverable: lead.bimDeliverable,
              notes: lead.notes,
              contactName: lead.contactName,
              contactPhone: lead.contactPhone,
            },
          };
        }
      }
      return { ...fallbackProject, lead: null } as MissionProject;
    },
    enabled: !missionId && !!fallbackProject,
  });

  const todaysMission = missionId ? mission : fallbackMission || fallbackProject;

  // Fetch mission log for current project
  const { data: missionLog, isLoading: missionLogLoading } = useQuery<MissionLog | null>({
    queryKey: ["/api/projects", todaysMission?.id, "mission-log"],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${todaysMission?.id}/mission-log`, { credentials: "include" });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!todaysMission?.id,
  });

  // Fetch expenses for current project
  const { data: projectExpenses = [] } = useQuery<Expense[]>({
    queryKey: ["/api/projects", todaysMission?.id, "expenses"],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${todaysMission?.id}/expenses`, { credentials: "include" });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!todaysMission?.id,
  });

  // Initialize chat with mission context
  useEffect(() => {
    if (todaysMission) {
      const projectName = (todaysMission as MissionProject).lead?.projectName || todaysMission.name;
      const address = (todaysMission as MissionProject).lead?.projectAddress || "Unknown location";
      setChatMessages([{
        id: "welcome",
        role: "assistant",
        content: `Hi! I'm your Field Support assistant for ${projectName}. I have access to the scope and details for this job at ${address}. Ask me about LOD requirements, equipment, or procedures. If I can't help, you can escalate to a manager.`,
        timestamp: new Date(),
      }]);
    } else {
      setChatMessages([{
        id: "welcome",
        role: "assistant",
        content: "Hi! I'm your Field Support assistant. Select a mission to get project-specific help, or ask me general questions about equipment and procedures.",
        timestamp: new Date(),
      }]);
    }
  }, [todaysMission?.id]);

  // Generate scope checklist based on project disciplines (per-project scoped)
  useEffect(() => {
    if (todaysMission) {
      const missionData = todaysMission as MissionProject;
      const disciplines = missionData.lead?.disciplines || "";
      const lod = missionData.targetLoD || "LOD 300";
      const checklist = generateScopeChecklist(disciplines, lod);
      
      // Load per-project checklist state
      const savedState = loadChecklistState(todaysMission.id);
      setChecklistState(savedState);
      
      // Apply saved checklist state to generated items
      checklist.forEach(item => {
        if (savedState[item.id]) {
          item.completed = true;
        }
      });
      
      setScopeChecklist(checklist);
    } else {
      // Reset when no mission selected
      setScopeChecklist([]);
      setChecklistState({});
    }
  }, [todaysMission?.id]);

  // Handle offline/online status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Autosave notes to localStorage (global draft)
  useEffect(() => {
    saveDraft({
      notes,
      projectId: todaysMission?.id || null,
    });
  }, [notes, todaysMission?.id]);

  // Autosave checklist state to localStorage (per-project)
  useEffect(() => {
    if (todaysMission?.id) {
      saveChecklistState(todaysMission.id, checklistState);
    }
  }, [checklistState, todaysMission?.id]);

  // Create mission log with Start Travel timestamp in one backend call
  const startTravelMutation = useMutation({
    mutationFn: async (projectId: number) => {
      const response = await apiRequest("POST", `/api/projects/${projectId}/mission-log`, { startTravel: true });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", todaysMission?.id, "mission-log"] });
      toast({ title: "Travel Started", description: "Mission timesheet created" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to start travel", description: error?.message || "Please try again", variant: "destructive" });
    },
  });

  // Update mission log timestamp mutation
  const updateTimestampMutation = useMutation({
    mutationFn: async ({ missionLogId, field, time, manual }: { missionLogId: number; field: string; time?: string; manual?: boolean }) => {
      const response = await apiRequest("PATCH", `/api/mission-logs/${missionLogId}`, { field, time, manual });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", todaysMission?.id, "mission-log"] });
      setEditingTimestamp(null);
      setManualTimeValue("");
    },
    onError: () => {
      toast({ title: "Failed to update timestamp", variant: "destructive" });
    },
  });

  // Expense mutation
  const addExpenseMutation = useMutation({
    mutationFn: async (expense: { category: string; amount: number; vendorName?: string; description?: string }) => {
      const response = await apiRequest("POST", `/api/projects/${todaysMission?.id}/expenses`, expense);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", todaysMission?.id, "expenses"] });
      toast({ title: "Expense Added", description: `${expenseCategory} expense recorded` });
      setExpenseCategory("");
      setExpenseAmount("");
      setExpenseVendor("");
      setExpenseDescription("");
    },
    onError: () => {
      toast({ title: "Failed to add expense", variant: "destructive" });
    },
  });

  // Voice transcription mutation
  const transcribeMutation = useMutation({
    mutationFn: async (audioBlob: Blob) => {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");
      if (todaysMission) {
        formData.append("projectId", todaysMission.id.toString());
      }
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) throw new Error("Transcription failed");
      return response.json();
    },
    onSuccess: (data) => {
      const transcribedText = data.transcription || data.text || data.transcript;
      if (transcribedText) {
        setNotes(prev => prev + (prev ? "\n" : "") + transcribedText);
        toast({ title: "Note Transcribed", description: "Voice note added" });
      }
    },
    onError: () => {
      toast({ title: "Transcription Failed", variant: "destructive" });
    },
  });

  // AI Support chat mutation (now with mission context)
  const sendChatMutation = useMutation({
    mutationFn: async (message: string) => {
      const missionData = todaysMission as MissionProject;
      const response = await apiRequest("POST", "/api/field-support/chat", {
        message,
        projectId: todaysMission?.id,
        universalProjectId: todaysMission?.universalProjectId,
        missionContext: {
          projectName: missionData?.lead?.projectName || todaysMission?.name || "Unknown Project",
          address: missionData?.lead?.projectAddress || "No address",
          buildingType: missionData?.lead?.buildingType || null,
          sqft: missionData?.lead?.sqft || null,
          scope: missionData?.lead?.scope || null,
          disciplines: missionData?.lead?.disciplines || null,
          lod: todaysMission?.targetLoD || "LOD 300",
          loa: todaysMission?.targetLoaMeasured || "LoA 40",
          notes: missionData?.lead?.notes || null,
        },
      });
      return response.json();
    },
    onSuccess: (data) => {
      setChatMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: data.response || "I couldn't find an answer. Would you like to escalate to a manager?",
          timestamp: new Date(),
        }
      ]);
    },
    onError: () => {
      setChatMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: "I'm having trouble connecting. Try again or escalate to a manager.",
          timestamp: new Date(),
        }
      ]);
    },
  });

  // Escalation mutation
  const escalateMutation = useMutation({
    mutationFn: async (question: string) => {
      const response = await apiRequest("POST", "/api/field-support/escalate", {
        question,
        projectId: todaysMission?.id,
        universalProjectId: todaysMission?.universalProjectId,
        techName: user?.firstName || user?.lastName || "Technician",
      });
      return response.json();
    },
    onSuccess: () => {
      setChatMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "system",
          content: "Your question has been sent to the management team. They will respond shortly.",
          timestamp: new Date(),
          escalated: true,
        }
      ]);
      toast({ title: "Escalated", description: "Manager notified via Google Chat" });
    },
    onError: () => {
      toast({ title: "Escalation Failed", variant: "destructive" });
    },
  });

  // Data Handover mutation (multi-file upload to Drive)
  const handoverMutation = useMutation({
    mutationFn: async () => {
      if (!todaysMission?.id || handoverFiles.length === 0) throw new Error("No files to upload");
      
      const formData = new FormData();
      const areaDescriptions: string[] = [];
      
      handoverFiles.forEach((hf, index) => {
        formData.append("files", hf.file);
        areaDescriptions.push(hf.areaDescription || "Site_Capture");
      });
      
      formData.append("areaDescriptions", JSON.stringify(areaDescriptions));
      
      const response = await fetch(`/api/projects/${todaysMission.id}/data-handover`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Upload failed");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setHandoverComplete(true);
      setHandoverFiles([]);
      setUploadProgress(0);
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ 
        title: "Data Handover Complete", 
        description: `${data.uploadedCount} files uploaded to Google Drive${data.statusAdvanced ? ". Project moved to Registration." : ""}` 
      });
    },
    onError: (error: any) => {
      toast({ title: "Upload Failed", description: error?.message || "Please try again", variant: "destructive" });
    },
  });

  // File handlers for data handover
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newHandoverFiles: HandoverFile[] = files.map(file => ({
      file,
      areaDescription: "",
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
    }));
    setHandoverFiles(prev => [...prev, ...newHandoverFiles]);
    if (e.target) e.target.value = "";
  };

  const updateFileDescription = (index: number, description: string) => {
    setHandoverFiles(prev => prev.map((hf, i) => 
      i === index ? { ...hf, areaDescription: description } : hf
    ));
  };

  const removeHandoverFile = (index: number) => {
    setHandoverFiles(prev => {
      const file = prev[index];
      if (file.preview) URL.revokeObjectURL(file.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Toggle checklist item
  const toggleChecklistItem = (itemId: string) => {
    setChecklistState(prev => {
      const newState = { ...prev, [itemId]: !prev[itemId] };
      return newState;
    });
    setScopeChecklist(prev => prev.map(item => 
      item.id === itemId ? { ...item, completed: !item.completed } : item
    ));
  };

  // Check if all checklist items are completed
  const allChecklistComplete = scopeChecklist.length === 0 || scopeChecklist.every(item => item.completed || checklistState[item.id]);

  // Scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Voice recording handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        transcribeMutation.mutate(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (error) {
      toast({ title: "Microphone Access Required", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: chatInput.trim(),
      timestamp: new Date(),
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setIsChatLoading(true);
    sendChatMutation.mutate(chatInput.trim(), {
      onSettled: () => setIsChatLoading(false),
    });
    setChatInput("");
  };

  const handleEscalate = () => {
    const lastUserMessage = [...chatMessages].reverse().find(m => m.role === "user");
    escalateMutation.mutate(lastUserMessage?.content || "General assistance needed");
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Get mission details
  const missionData = todaysMission as MissionProject;
  const projectName = missionData?.lead?.projectName || missionData?.name || "No Mission";
  const projectAddress = missionData?.lead?.projectAddress || "No address";
  const isLoading = missionId ? missionLoading : projectsLoading;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Offline Indicator */}
      {isOffline && (
        <div className="bg-amber-500/20 border-b border-amber-500/50 px-3 py-2 text-center text-sm text-amber-600 dark:text-amber-400" data-testid="banner-offline">
          <AlertTriangle className="w-4 h-4 inline mr-2" />
          Offline - Data will sync when connection is restored
        </div>
      )}
      
      {/* Mission Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="p-3">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Building2 className="w-5 h-5 text-primary flex-shrink-0" />
              <span className="font-semibold text-base truncate" data-testid="text-project-name">
                {projectName}
              </span>
            </div>
            {missionData?.universalProjectId && (
              <Badge variant="outline" className="font-mono text-xs flex-shrink-0" data-testid="badge-upid">
                {missionData.universalProjectId}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate" data-testid="text-project-address">{projectAddress}</span>
          </div>
        </div>
        
        {/* Four-Point Logistics Tracker */}
        {todaysMission && (
          <div className="px-3 py-2 border-t">
            <div className="space-y-2">
              {/* Timestamp Row 1: Start Travel -> Arrive Site */}
              <div className="grid grid-cols-2 gap-2">
                {/* Start Travel - Special handling: creates mission log if not exists */}
                {!missionLog ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex flex-col items-center gap-1 h-auto py-2"
                    onClick={() => startTravelMutation.mutate(todaysMission.id)}
                    disabled={startTravelMutation.isPending}
                    data-testid="button-start-travel"
                  >
                    <Car className="w-4 h-4" />
                    <span className="text-xs">Start Travel</span>
                    {startTravelMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                  </Button>
                ) : (
                  <TimestampButton
                    label="Start Travel"
                    icon={<Car className="w-4 h-4" />}
                    timestamp={missionLog.startTravelTime}
                    isManual={missionLog.startTravelManual}
                    field="startTravelTime"
                    missionLogId={missionLog.id}
                    updateMutation={updateTimestampMutation}
                    editingTimestamp={editingTimestamp}
                    setEditingTimestamp={setEditingTimestamp}
                    manualTimeValue={manualTimeValue}
                    setManualTimeValue={setManualTimeValue}
                    disabled={false}
                    nextTimestamp={missionLog.arriveSiteTime}
                    showToast={toast}
                  />
                )}
                {/* Arrive Site */}
                {missionLog ? (
                  <TimestampButton
                    label="Arrive Site"
                    icon={<MapPin className="w-4 h-4" />}
                    timestamp={missionLog.arriveSiteTime}
                    isManual={missionLog.arriveSiteManual}
                    field="arriveSiteTime"
                    missionLogId={missionLog.id}
                    updateMutation={updateTimestampMutation}
                    editingTimestamp={editingTimestamp}
                    setEditingTimestamp={setEditingTimestamp}
                    manualTimeValue={manualTimeValue}
                    setManualTimeValue={setManualTimeValue}
                    disabled={!missionLog.startTravelTime}
                    previousTimestamp={missionLog.startTravelTime}
                    nextTimestamp={missionLog.leaveSiteTime}
                    showToast={toast}
                  />
                ) : (
                  <Button variant="outline" size="sm" className="flex flex-col items-center gap-1 h-auto py-2 opacity-50" disabled data-testid="button-arrive-site-disabled">
                    <MapPin className="w-4 h-4" />
                    <span className="text-xs">Arrive Site</span>
                  </Button>
                )}
              </div>
              {/* Timestamp Row 2: Leave Site -> Arrive Home */}
              <div className="grid grid-cols-2 gap-2">
                {missionLog ? (
                  <TimestampButton
                    label="Leave Site"
                    icon={<Square className="w-4 h-4" />}
                    timestamp={missionLog.leaveSiteTime}
                    isManual={missionLog.leaveSiteManual}
                    field="leaveSiteTime"
                    missionLogId={missionLog.id}
                    updateMutation={updateTimestampMutation}
                    editingTimestamp={editingTimestamp}
                    setEditingTimestamp={setEditingTimestamp}
                    manualTimeValue={manualTimeValue}
                    setManualTimeValue={setManualTimeValue}
                    disabled={!missionLog.arriveSiteTime || !allChecklistComplete}
                    previousTimestamp={missionLog.arriveSiteTime}
                    nextTimestamp={missionLog.arriveHomeTime}
                    showToast={toast}
                  />
                ) : (
                  <Button variant="outline" size="sm" className="flex flex-col items-center gap-1 h-auto py-2 opacity-50" disabled data-testid="button-leave-site-disabled">
                    <Square className="w-4 h-4" />
                    <span className="text-xs">Leave Site</span>
                  </Button>
                )}
                {missionLog ? (
                  <TimestampButton
                    label="Arrive Home"
                    icon={<Home className="w-4 h-4" />}
                    timestamp={missionLog.arriveHomeTime}
                    isManual={missionLog.arriveHomeManual}
                    field="arriveHomeTime"
                    missionLogId={missionLog.id}
                    updateMutation={updateTimestampMutation}
                    editingTimestamp={editingTimestamp}
                    setEditingTimestamp={setEditingTimestamp}
                    manualTimeValue={manualTimeValue}
                    setManualTimeValue={setManualTimeValue}
                    disabled={!missionLog.leaveSiteTime}
                    previousTimestamp={missionLog.leaveSiteTime}
                    showToast={toast}
                  />
                ) : (
                  <Button variant="outline" size="sm" className="flex flex-col items-center gap-1 h-auto py-2 opacity-50" disabled data-testid="button-arrive-home-disabled">
                    <Home className="w-4 h-4" />
                    <span className="text-xs">Arrive Home</span>
                  </Button>
                )}
              </div>
              {/* Duration Summary */}
              {missionLog && (missionLog.travelDurationMinutes || missionLog.scanningDurationMinutes) && (
                <div className="grid grid-cols-2 gap-2 pt-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Car className="w-3 h-3" />
                    <span>Travel: {missionLog.travelDurationMinutes ? `${Math.floor(missionLog.travelDurationMinutes / 60)}h ${missionLog.travelDurationMinutes % 60}m` : "--"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>On-Site: {missionLog.scanningDurationMinutes ? `${Math.floor(missionLog.scanningDurationMinutes / 60)}h ${missionLog.scanningDurationMinutes % 60}m` : "--"}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : !todaysMission ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <Building2 className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <h2 className="text-lg font-semibold mb-2">No Mission Assigned</h2>
            <p className="text-sm text-muted-foreground">
              You don't have a mission assigned for today. Contact your manager for assignment.
            </p>
          </div>
        ) : activeTab === "mission" && (
          <div className="space-y-3">
            {/* Action Center */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                size="lg"
                className="h-20 flex-col gap-1"
                onClick={() => {}}
                data-testid="button-add-note"
              >
                <FileText className="w-6 h-6" />
                <span className="text-xs">Add Note</span>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-20 flex-col gap-1"
                onClick={() => {}}
                data-testid="button-upload-video"
              >
                <Video className="w-6 h-6" />
                <span className="text-xs">Video Walkthrough</span>
              </Button>
            </div>

            {/* Voice Notes Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Mic className="w-4 h-4" />
                  Field Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  placeholder="Type notes or use voice recording..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[100px] text-base"
                  data-testid="input-field-notes"
                />
                <Button
                  variant={isRecording ? "destructive" : "default"}
                  size="lg"
                  className="w-full"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={transcribeMutation.isPending}
                  data-testid="button-voice-record"
                >
                  {isRecording ? (
                    <>
                      <MicOff className="w-5 h-5 mr-2" />
                      Stop Recording ({formatDuration(recordingDuration)})
                    </>
                  ) : transcribeMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Transcribing...
                    </>
                  ) : (
                    <>
                      <Mic className="w-5 h-5 mr-2" />
                      Record Voice Note
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Scope Checklist Card */}
            {scopeChecklist.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      Scope Checklist
                    </span>
                    <Badge variant={allChecklistComplete ? "default" : "secondary"} className="text-xs">
                      {scopeChecklist.filter(item => item.completed || checklistState[item.id]).length}/{scopeChecklist.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {!allChecklistComplete && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">
                      <AlertTriangle className="w-3 h-3 inline mr-1" />
                      Complete all items before leaving site
                    </p>
                  )}
                  {scopeChecklist.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 p-2 rounded-md hover-elevate cursor-pointer"
                      onClick={() => toggleChecklistItem(item.id)}
                      data-testid={`checklist-item-${item.id}`}
                    >
                      <div className={`w-5 h-5 flex-shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                        item.completed || checklistState[item.id]
                          ? "bg-emerald-500 border-emerald-500"
                          : "border-muted-foreground/50"
                      }`}>
                        {(item.completed || checklistState[item.id]) && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-relaxed ${
                          item.completed || checklistState[item.id] ? "line-through text-muted-foreground" : ""
                        }`}>
                          {item.label}
                        </p>
                        <Badge variant="outline" className="text-xs mt-1">{item.category}</Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Job Details Collapsible */}
            <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Wrench className="w-4 h-4" />
                        Job Details
                      </span>
                      {detailsOpen ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">LOD Target</p>
                        <Badge variant="secondary" data-testid="badge-lod">
                          {missionData?.targetLoD || "LOD 300"}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">LoA Target</p>
                        <Badge variant="secondary" data-testid="badge-loa">
                          {missionData?.targetLoaMeasured || "LoA 40"}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Building Type</p>
                        <p className="font-medium" data-testid="text-building-type">
                          {missionData?.lead?.buildingType || "Not specified"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Square Feet</p>
                        <p className="font-medium" data-testid="text-sqft">
                          {missionData?.lead?.sqft?.toLocaleString() || "N/A"}
                        </p>
                      </div>
                    </div>
                    
                    {missionData?.lead?.disciplines && (
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">Disciplines</p>
                        <p className="text-sm" data-testid="text-disciplines">
                          {missionData.lead.disciplines}
                        </p>
                      </div>
                    )}
                    
                    {missionData?.lead?.scope && (
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">Scope</p>
                        <p className="text-sm" data-testid="text-scope">
                          {missionData.lead.scope}
                        </p>
                      </div>
                    )}
                    
                    {missionData?.lead?.notes && (
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">Scoping Notes</p>
                        <p className="text-sm whitespace-pre-wrap" data-testid="text-scoping-notes">
                          {missionData.lead.notes}
                        </p>
                      </div>
                    )}

                    {missionData?.lead?.contactName && (
                      <div className="pt-2 border-t">
                        <p className="text-muted-foreground text-xs mb-1">Site Contact</p>
                        <p className="text-sm font-medium" data-testid="text-contact-name">
                          {missionData.lead.contactName}
                        </p>
                        {missionData.lead.contactPhone && (
                          <a 
                            href={`tel:${missionData.lead.contactPhone}`}
                            className="text-sm text-primary underline"
                            data-testid="link-contact-phone"
                          >
                            {missionData.lead.contactPhone}
                          </a>
                        )}
                      </div>
                    )}

                    {/* Google Maps Navigation */}
                    {projectAddress && (
                      <div className="pt-2 border-t">
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            const encodedAddress = encodeURIComponent(projectAddress);
                            window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`, "_blank");
                          }}
                          data-testid="button-navigate-maps"
                        >
                          <Navigation className="w-4 h-4 mr-2" />
                          Navigate to Site
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Expense Entry Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Receipt className="w-4 h-4" />
                  Field Expenses
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Select value={expenseCategory} onValueChange={setExpenseCategory}>
                    <SelectTrigger data-testid="select-expense-category">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {FIELD_EXPENSE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat} data-testid={`option-expense-${cat.toLowerCase()}`}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="relative">
                    <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Amount"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      className="pl-8"
                      data-testid="input-expense-amount"
                    />
                  </div>
                </div>
                <Input
                  placeholder="Vendor (optional)"
                  value={expenseVendor}
                  onChange={(e) => setExpenseVendor(e.target.value)}
                  data-testid="input-expense-vendor"
                />
                <Input
                  placeholder="Description (optional)"
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                  data-testid="input-expense-description"
                />
                <Button
                  className="w-full"
                  onClick={() => {
                    if (expenseCategory && expenseAmount) {
                      addExpenseMutation.mutate({
                        category: expenseCategory,
                        amount: parseFloat(expenseAmount),
                        vendorName: expenseVendor || undefined,
                        description: expenseDescription || undefined,
                      });
                    }
                  }}
                  disabled={!expenseCategory || !expenseAmount || addExpenseMutation.isPending}
                  data-testid="button-add-expense"
                >
                  {addExpenseMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Add Expense
                </Button>

                {/* Show today's expenses */}
                {projectExpenses.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-2">Today's Expenses</p>
                    <div className="space-y-1">
                      {projectExpenses.map((exp) => (
                        <div key={exp.id} className="flex items-center justify-between text-sm" data-testid={`expense-item-${exp.id}`}>
                          <span className="text-muted-foreground">{exp.category}</span>
                          <span className="font-medium">${parseFloat(exp.amount).toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between text-sm font-semibold border-t pt-1">
                        <span>Total</span>
                        <span data-testid="text-expense-total">
                          ${projectExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Data Handover Section - visible after Leave Site */}
            {missionLog?.leaveSiteTime && (
              <Card className={handoverComplete ? "border-green-500/50" : ""}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {handoverComplete ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    Final Data Upload
                    {handoverComplete && (
                      <Badge variant="secondary" className="ml-auto text-green-600">Complete</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {handoverComplete ? (
                    <div className="text-center py-4">
                      <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
                      <p className="text-sm font-medium">Data Handover Complete</p>
                      <p className="text-xs text-muted-foreground">Files uploaded to Google Drive. PM notified.</p>
                      {(todaysMission as MissionProject)?.driveFolderUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3"
                          onClick={() => window.open((todaysMission as MissionProject).driveFolderUrl!, "_blank")}
                          data-testid="button-view-drive-folder"
                        >
                          <FolderOpen className="w-4 h-4 mr-2" />
                          View Drive Folder
                        </Button>
                      )}
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground">
                        Upload video walkthroughs, scan data, and site photos. Files go directly to the project's Google Drive folder.
                      </p>
                      
                      {/* Hidden file input */}
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept="video/*,image/*,.rcs,.rcp,.e57,.las,.laz,.pts"
                        multiple
                        className="hidden"
                        data-testid="input-handover-files"
                      />
                      
                      {/* Add files button */}
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => fileInputRef.current?.click()}
                        data-testid="button-add-media"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Site Media
                      </Button>
                      
                      {/* File list with area descriptions */}
                      {handoverFiles.length > 0 && (
                        <div className="space-y-2">
                          {handoverFiles.map((hf, index) => (
                            <div 
                              key={index} 
                              className="flex items-start gap-2 p-2 bg-muted/50 rounded-md"
                              data-testid={`handover-file-${index}`}
                            >
                              {hf.preview ? (
                                <img src={hf.preview} alt="" className="w-12 h-12 object-cover rounded" />
                              ) : (
                                <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                                  <Video className="w-5 h-5 text-muted-foreground" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs truncate">{hf.file.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {(hf.file.size / (1024 * 1024)).toFixed(1)} MB
                                </p>
                                <Input
                                  placeholder="Area description (e.g., Main Lobby)"
                                  value={hf.areaDescription}
                                  onChange={(e) => updateFileDescription(index, e.target.value)}
                                  className="mt-1 h-7 text-xs"
                                  data-testid={`input-area-desc-${index}`}
                                />
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 flex-shrink-0"
                                onClick={() => removeHandoverFile(index)}
                                data-testid={`button-remove-file-${index}`}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Upload progress */}
                      {handoverMutation.isPending && (
                        <div className="space-y-2">
                          <Progress value={uploadProgress} className="h-2" />
                          <p className="text-xs text-center text-muted-foreground">
                            Uploading to Google Drive...
                          </p>
                        </div>
                      )}
                      
                      {/* Submit handover */}
                      {handoverFiles.length > 0 && (
                        <Button
                          className="w-full"
                          onClick={() => handoverMutation.mutate()}
                          disabled={handoverMutation.isPending}
                          data-testid="button-submit-handover"
                        >
                          {handoverMutation.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4 mr-2" />
                          )}
                          Upload {handoverFiles.length} File{handoverFiles.length !== 1 ? "s" : ""} to Drive
                        </Button>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === "support" && (
          <div className="flex flex-col h-full">
            {/* Chat Messages */}
            <ScrollArea className="flex-1 pr-2" ref={chatScrollRef}>
              <div className="space-y-3 pb-4">
                {chatMessages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.role !== "user" && (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        {msg.role === "system" ? (
                          <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        ) : (
                          <Bot className="w-4 h-4 text-primary" />
                        )}
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : msg.escalated
                          ? "bg-yellow-500/10 border border-yellow-500/30"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <p className="text-xs opacity-60 mt-1">
                        {format(msg.timestamp, "h:mm a")}
                      </p>
                    </div>
                    {msg.role === "user" && (
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    </div>
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-sm text-muted-foreground">Thinking...</p>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Escalate Button */}
            <Button
              variant="outline"
              className="mb-3 border-yellow-500/50 text-yellow-600 dark:text-yellow-400"
              onClick={handleEscalate}
              disabled={escalateMutation.isPending}
              data-testid="button-escalate"
            >
              <PhoneCall className="w-4 h-4 mr-2" />
              {escalateMutation.isPending ? "Escalating..." : "Escalate to Manager"}
            </Button>

            {/* Chat Input */}
            <div className="flex gap-2">
              <Textarea
                placeholder="Ask about this job, equipment, LOD..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="min-h-[44px] max-h-[100px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendChat();
                  }
                }}
                data-testid="input-chat"
              />
              <Button
                size="icon"
                onClick={handleSendChat}
                disabled={!chatInput.trim() || isChatLoading}
                data-testid="button-send-chat"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {activeTab === "profile" && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold" data-testid="text-user-name">
                      {user?.firstName || user?.lastName || "Technician"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {user?.email || "Field Technician"}
                    </p>
                    <Badge variant="secondary" className="mt-1">
                      {user?.role || "production"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="ghost" className="w-full justify-start" data-testid="button-notifications">
                  <Settings className="w-4 h-4 mr-2" />
                  Notification Preferences
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="sticky bottom-0 z-50 flex items-center justify-around border-t bg-background/95 backdrop-blur p-2 safe-area-inset-bottom">
        <Button
          variant={activeTab === "mission" ? "default" : "ghost"}
          size="sm"
          className="flex-1 flex-col gap-1 h-14"
          onClick={() => setActiveTab("mission")}
          data-testid="nav-mission"
        >
          <Building2 className="w-5 h-5" />
          <span className="text-xs">Mission</span>
        </Button>
        <Button
          variant={activeTab === "support" ? "default" : "ghost"}
          size="sm"
          className="flex-1 flex-col gap-1 h-14"
          onClick={() => setActiveTab("support")}
          data-testid="nav-support"
        >
          <HelpCircle className="w-5 h-5" />
          <span className="text-xs">Support</span>
        </Button>
        <Button
          variant={activeTab === "profile" ? "default" : "ghost"}
          size="sm"
          className="flex-1 flex-col gap-1 h-14"
          onClick={() => setActiveTab("profile")}
          data-testid="nav-profile"
        >
          <User className="w-5 h-5" />
          <span className="text-xs">Profile</span>
        </Button>
      </nav>
    </div>
  );
}
