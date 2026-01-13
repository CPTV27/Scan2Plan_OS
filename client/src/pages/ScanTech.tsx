import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Project, Expense, MissionLog } from "@shared/schema";
import { FIELD_EXPENSE_CATEGORIES } from "@shared/schema";
import { Sidebar, MobileHeader } from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  Compass, 
  MapPin,
  Building2,
  ChevronRight,
  ChevronLeft,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  Play,
  Car,
  Home,
  Navigation,
  DollarSign,
  Plus,
  Receipt,
  Upload,
  Video,
  X,
  FolderOpen,
  Pencil,
  Check,
  FileText,
  ClipboardList
} from "lucide-react";
import { format } from "date-fns";

// Types
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
  } | null;
}

interface ScopeChecklistItem {
  id: string;
  label: string;
  category: string;
  completed: boolean;
}

interface HandoverFile {
  file: File;
  areaDescription: string;
  preview?: string;
}

// Generate dynamic scope checklist
function generateScopeChecklist(disciplines: string, lod?: string): ScopeChecklistItem[] {
  const items: ScopeChecklistItem[] = [];
  const disciplinesLower = disciplines?.toLowerCase() || "";
  const lodLevel = lod || "LOD 300";
  
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
  
  if (disciplinesLower.includes("elec") || disciplinesLower.includes("mep")) {
    items.push({
      id: "elec-1",
      label: "Detail all panel schedules and transformer tags",
      category: "Electrical",
      completed: false,
    });
  }
  
  if (disciplinesLower.includes("plumb") || disciplinesLower.includes("mep")) {
    items.push({
      id: "plumb-1",
      label: "Document pipe sizing and material where visible",
      category: "Plumbing",
      completed: false,
    });
  }
  
  if (disciplinesLower.includes("struct")) {
    items.push({
      id: "struct-1",
      label: "Capture structural grid and column locations",
      category: "Structural",
      completed: false,
    });
  }
  
  if (lodLevel.includes("350") || lodLevel.includes("400")) {
    items.push({
      id: "lod350-1",
      label: "Verify hanger locations and secondary supports",
      category: "LOD 350+",
      completed: false,
    });
  }
  
  // Required items (hard gate)
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

// LocalStorage helpers for checklist persistence
function loadChecklistState(projectId: number): Record<string, boolean> {
  try {
    const key = `scantech-checklist-${projectId}`;
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function saveChecklistState(projectId: number, state: Record<string, boolean>) {
  try {
    const key = `scantech-checklist-${projectId}`;
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

// Mission status helper
function getMissionStatus(missionLog: MissionLog | undefined): {
  label: string;
  color: string;
  icon: typeof Play;
} {
  if (!missionLog) {
    return { label: "Not Started", color: "text-muted-foreground", icon: Play };
  }
  if (missionLog.arriveHomeTime) {
    return { label: "Complete", color: "text-green-500", icon: CheckCircle2 };
  }
  if (missionLog.leaveSiteTime) {
    return { label: "Returning", color: "text-blue-500", icon: Home };
  }
  if (missionLog.arriveSiteTime) {
    return { label: "On Site", color: "text-green-500", icon: Building2 };
  }
  if (missionLog.startTravelTime) {
    return { label: "Traveling", color: "text-yellow-500", icon: Car };
  }
  return { label: "Not Started", color: "text-muted-foreground", icon: Play };
}

export default function ScanTech() {
  const { toast } = useToast();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"mission" | "checklist" | "expenses">("mission");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Expense form state
  const [expenseCategory, setExpenseCategory] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseVendor, setExpenseVendor] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  
  // Handover state
  const [handoverFiles, setHandoverFiles] = useState<HandoverFile[]>([]);
  const [handoverComplete, setHandoverComplete] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Checklist state
  const [scopeChecklist, setScopeChecklist] = useState<ScopeChecklistItem[]>([]);
  
  // Timestamp edit state
  const [editingTimestamp, setEditingTimestamp] = useState<string | null>(null);
  const [editTimestampValue, setEditTimestampValue] = useState("");
  
  // Fetch projects
  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  // Fetch today's mission logs
  const { data: missionLogs, isLoading: missionLogsLoading } = useQuery<MissionLog[]>({
    queryKey: ["/api/mission-logs/today"],
  });

  // Fetch selected project details
  const { data: selectedProject } = useQuery<MissionProject>({
    queryKey: ["/api/projects", selectedProjectId, "mission-detail"],
    queryFn: async () => {
      if (!selectedProjectId) return null;
      const res = await fetch(`/api/projects/${selectedProjectId}/mission-detail`);
      if (!res.ok) throw new Error("Failed to fetch project");
      return res.json();
    },
    enabled: !!selectedProjectId,
  });

  // Fetch expenses for selected project
  const { data: expenses = [] } = useQuery<Expense[]>({
    queryKey: ["/api/projects", selectedProjectId, "expenses"],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const res = await fetch(`/api/projects/${selectedProjectId}/expenses`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedProjectId,
  });

  // Get mission log for selected project
  const missionLog = missionLogs?.find(l => l.projectId === selectedProjectId);

  // Filter for today's missions
  const todaysMissions = projects?.filter(p => 
    p.status === "Scanning" || p.status === "Scheduling"
  ) ?? [];

  // Active missions (not completed)
  const activeMissions = todaysMissions.filter(p => {
    const log = missionLogs?.find(l => l.projectId === p.id);
    return !log?.arriveHomeTime;
  });

  // Completed missions
  const completedMissions = todaysMissions.filter(p => {
    const log = missionLogs?.find(l => l.projectId === p.id);
    return log?.arriveHomeTime;
  });

  // Initialize checklist when project changes
  useEffect(() => {
    if (selectedProject) {
      const disciplines = selectedProject.lead?.disciplines || "";
      const lod = selectedProject.targetLoD || "LOD 300";
      const items = generateScopeChecklist(disciplines, lod);
      
      // Load saved state
      const savedState = loadChecklistState(selectedProject.id);
      items.forEach(item => {
        if (savedState[item.id] !== undefined) {
          item.completed = savedState[item.id];
        }
      });
      
      setScopeChecklist(items);
    }
  }, [selectedProject]);

  // Logistics mutations
  const startTravelMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/mission-logs", {
        projectId: selectedProjectId,
        startTravel: true,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mission-logs/today"] });
      toast({ title: "Travel Started", description: "Safe travels!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not start travel", variant: "destructive" });
    },
  });

  const arriveSiteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/mission-logs/${missionLog?.id}`, {
        arriveSiteTime: new Date().toISOString(),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mission-logs/today"] });
      toast({ title: "Arrived", description: "You're on site" });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not record arrival", variant: "destructive" });
    },
  });

  const leaveSiteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/mission-logs/${missionLog?.id}`, {
        leaveSiteTime: new Date().toISOString(),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mission-logs/today"] });
      toast({ title: "Departed", description: "Heading home" });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not record departure", variant: "destructive" });
    },
  });

  const arriveHomeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/mission-logs/${missionLog?.id}`, {
        arriveHomeTime: new Date().toISOString(),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mission-logs/today"] });
      toast({ title: "Mission Complete", description: "Great work today!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not complete mission", variant: "destructive" });
    },
  });

  const updateTimestampMutation = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: string }) => {
      const res = await apiRequest("PATCH", `/api/mission-logs/${missionLog?.id}`, {
        [field]: new Date(value).toISOString(),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mission-logs/today"] });
      setEditingTimestamp(null);
      toast({ title: "Updated", description: "Timestamp corrected" });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not update", variant: "destructive" });
    },
  });

  // Expense mutation
  const addExpenseMutation = useMutation({
    mutationFn: async (data: { category: string; amount: number; vendorName?: string; description?: string }) => {
      const res = await apiRequest("POST", `/api/projects/${selectedProjectId}/expenses`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", selectedProjectId, "expenses"] });
      setExpenseCategory("");
      setExpenseAmount("");
      setExpenseVendor("");
      setExpenseDescription("");
      toast({ title: "Expense Added" });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not add expense", variant: "destructive" });
    },
  });

  // Handover mutation
  const handoverMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      handoverFiles.forEach(hf => formData.append("files", hf.file));
      formData.append("areaDescriptions", JSON.stringify(handoverFiles.map(hf => hf.areaDescription)));
      
      const res = await fetch(`/api/projects/${selectedProjectId}/data-handover`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: () => {
      setHandoverComplete(true);
      setHandoverFiles([]);
      queryClient.invalidateQueries({ queryKey: ["/api/projects", selectedProjectId] });
      toast({ title: "Upload Complete", description: "Files sent to Google Drive. PM notified." });
    },
    onError: () => {
      toast({ title: "Upload Failed", description: "Could not upload files", variant: "destructive" });
    },
  });

  // Checklist toggle
  const toggleChecklistItem = (itemId: string) => {
    if (!selectedProjectId) return;
    
    setScopeChecklist(prev => {
      const updated = prev.map(item =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      );
      
      const savedState: Record<string, boolean> = {};
      updated.forEach(item => {
        savedState[item.id] = item.completed;
      });
      saveChecklistState(selectedProjectId, savedState);
      
      return updated;
    });
  };

  // File handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newFiles: HandoverFile[] = files.map(file => ({
      file,
      areaDescription: "",
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
    }));
    setHandoverFiles(prev => [...prev, ...newFiles]);
  };

  const updateFileDescription = (index: number, description: string) => {
    setHandoverFiles(prev => prev.map((hf, i) => 
      i === index ? { ...hf, areaDescription: description } : hf
    ));
  };

  const removeHandoverFile = (index: number) => {
    setHandoverFiles(prev => {
      const updated = [...prev];
      if (updated[index].preview) URL.revokeObjectURL(updated[index].preview!);
      updated.splice(index, 1);
      return updated;
    });
  };

  // Check if Leave Site is allowed
  const requiredItems = scopeChecklist.filter(item => item.category === "Required");
  const allRequiredComplete = requiredItems.every(item => item.completed);

  // Navigation
  const openGoogleMaps = (address: string) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`, "_blank");
  };

  // Loading state
  if (projectsLoading || missionLogsLoading) {
    return (
      <div className="flex min-h-screen bg-background text-foreground">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <MobileHeader />
          <div className="p-4 md:p-8 space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // Mission list view (no project selected)
  if (!selectedProjectId) {
    return (
      <div className="flex min-h-screen bg-background text-foreground">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <MobileHeader />
          
          {/* Header */}
          <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Compass className="h-6 w-6 text-primary" />
                <h1 className="text-lg font-semibold">Field Hub</h1>
              </div>
              <Badge variant="outline" className="text-xs">
                {format(new Date(), "MMM d, yyyy")}
              </Badge>
            </div>
          </header>

          <main className="flex-1 px-4 py-4 md:p-8">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">Today's Missions</h2>
              <p className="text-sm text-muted-foreground">Select a mission to begin</p>
            </div>

            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="space-y-3 pr-2">
                {activeMissions.length === 0 && completedMissions.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-3" />
                      <p className="font-medium">No missions scheduled</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Check back later for new assignments
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {activeMissions.map((project) => {
                      const log = missionLogs?.find(l => l.projectId === project.id);
                      const status = getMissionStatus(log);
                      const StatusIcon = status.icon;
                      
                      return (
                        <Card 
                          key={project.id}
                          className="hover-elevate cursor-pointer transition-all"
                          onClick={() => setSelectedProjectId(project.id)}
                          data-testid={`mission-card-${project.id}`}
                        >
                          <CardHeader className="p-4 pb-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <CardTitle className="text-base truncate">
                                  {project.name || `Project #${project.id}`}
                                </CardTitle>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                                  <MapPin className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">
                                    {project.projectAddress || "No address"}
                                  </span>
                                </div>
                              </div>
                              <Badge 
                                variant={log?.startTravelTime ? "default" : "outline"}
                                className="flex-shrink-0"
                              >
                                <StatusIcon className={`h-3 w-3 mr-1 ${status.color}`} />
                                {status.label}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="p-4 pt-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                {project.estimatedSqft && (
                                  <span>{project.estimatedSqft.toLocaleString()} SF</span>
                                )}
                                {project.targetLoD && (
                                  <span>LOD {project.targetLoD}</span>
                                )}
                              </div>
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                    
                    {completedMissions.length > 0 && (
                      <>
                        <div className="pt-4 pb-2">
                          <p className="text-sm font-medium text-muted-foreground">Completed Today</p>
                        </div>
                        {completedMissions.map((project) => {
                          const log = missionLogs?.find(l => l.projectId === project.id);
                          
                          return (
                            <Card 
                              key={project.id}
                              className="hover-elevate cursor-pointer border-green-500/30"
                              onClick={() => setSelectedProjectId(project.id)}
                              data-testid={`completed-mission-${project.id}`}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                    <div>
                                      <p className="font-medium">{project.name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {log?.travelDurationMinutes || 0} min travel, {log?.scanningDurationMinutes || 0} min on-site
                                      </p>
                                    </div>
                                  </div>
                                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </>
                    )}
                  </>
                )}
              </div>
            </ScrollArea>
          </main>
        </div>
      </div>
    );
  }

  // Mission detail view (project selected)
  const completedCount = scopeChecklist.filter(i => i.completed).length;
  const totalCount = scopeChecklist.length;

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileHeader />
        
        {/* Header with back button */}
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setSelectedProjectId(null)}
              data-testid="button-back"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-semibold truncate">
                {selectedProject?.name || "Loading..."}
              </h1>
              <p className="text-xs text-muted-foreground truncate">
                {selectedProject?.projectAddress || ""}
              </p>
            </div>
            {selectedProject?.projectAddress && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => openGoogleMaps(selectedProject.projectAddress!)}
                data-testid="button-navigate"
              >
                <Navigation className="h-4 w-4 mr-1" />
                Navigate
              </Button>
            )}
          </div>
        </header>

        {/* Tab navigation */}
        <div className="flex border-b px-4">
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "mission" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
            }`}
            onClick={() => setActiveTab("mission")}
            data-testid="tab-mission"
          >
            <Car className="h-4 w-4 inline mr-1" />
            Mission
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "checklist" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
            }`}
            onClick={() => setActiveTab("checklist")}
            data-testid="tab-checklist"
          >
            <ClipboardList className="h-4 w-4 inline mr-1" />
            Checklist ({completedCount}/{totalCount})
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "expenses" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
            }`}
            onClick={() => setActiveTab("expenses")}
            data-testid="tab-expenses"
          >
            <Receipt className="h-4 w-4 inline mr-1" />
            Expenses
          </button>
        </div>

        <main className="flex-1 px-4 py-4 overflow-auto">
          {activeTab === "mission" && (
            <div className="space-y-4">
              {/* Four-Point Logistics with Time Inputs */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Logistics Tracker
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Time Input Row Component */}
                  {[
                    { 
                      field: "startTravelTime" as const, 
                      label: "Start Travel", 
                      icon: Car,
                      value: missionLog?.startTravelTime,
                      canSet: true,
                      isCreate: !missionLog?.id
                    },
                    { 
                      field: "arriveSiteTime" as const, 
                      label: "Arrive Site", 
                      icon: Building2,
                      value: missionLog?.arriveSiteTime,
                      canSet: !!missionLog?.id && !!missionLog?.startTravelTime,
                      isCreate: false
                    },
                    { 
                      field: "leaveSiteTime" as const, 
                      label: "Leave Site", 
                      icon: Home,
                      value: missionLog?.leaveSiteTime,
                      canSet: !!missionLog?.id && !!missionLog?.arriveSiteTime && allRequiredComplete,
                      isCreate: false
                    },
                    { 
                      field: "arriveHomeTime" as const, 
                      label: "Arrive Home", 
                      icon: CheckCircle2,
                      value: missionLog?.arriveHomeTime,
                      canSet: !!missionLog?.id && !!missionLog?.leaveSiteTime,
                      isCreate: false
                    }
                  ].map(({ field, label, icon: Icon, value, canSet, isCreate }) => {
                    const isEditing = editingTimestamp === field;
                    const currentTimeValue = value ? format(new Date(value), "HH:mm") : "";
                    
                    return (
                      <div key={field} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${value ? "text-green-500" : "text-muted-foreground"}`} />
                          <span className="text-sm font-medium">{label}</span>
                        </div>
                        <div className="flex items-center gap-2 pl-6">
                          <Input
                            type="time"
                            value={isEditing ? editTimestampValue : currentTimeValue}
                            onChange={(e) => {
                              if (!isEditing) setEditingTimestamp(field);
                              setEditTimestampValue(e.target.value);
                            }}
                            onFocus={() => {
                              setEditingTimestamp(field);
                              setEditTimestampValue(currentTimeValue);
                            }}
                            className="h-8 w-28 text-sm"
                            disabled={!canSet}
                            data-testid={`input-${field}`}
                          />
                          <Button 
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const now = new Date();
                              if (isCreate) {
                                startTravelMutation.mutate();
                              } else if (missionLog?.id) {
                                updateTimestampMutation.mutate({ field, value: now.toISOString() });
                              }
                              setEditingTimestamp(null);
                            }}
                            disabled={!canSet || startTravelMutation.isPending || updateTimestampMutation.isPending}
                            data-testid={`button-now-${field}`}
                          >
                            Now
                          </Button>
                          {isEditing && editTimestampValue && editTimestampValue !== currentTimeValue && (
                            <Button 
                              size="sm"
                              onClick={() => {
                                const today = new Date();
                                const [h, m] = editTimestampValue.split(":");
                                today.setHours(parseInt(h), parseInt(m), 0, 0);
                                if (isCreate) {
                                  startTravelMutation.mutate();
                                } else if (missionLog?.id) {
                                  updateTimestampMutation.mutate({ field, value: today.toISOString() });
                                }
                                setEditingTimestamp(null);
                              }}
                              disabled={startTravelMutation.isPending || updateTimestampMutation.isPending}
                              data-testid={`button-save-${field}`}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        {field === "leaveSiteTime" && !allRequiredComplete && missionLog?.arriveSiteTime && !missionLog?.leaveSiteTime && (
                          <p className="text-xs text-destructive pl-6">Complete required checklist items first</p>
                        )}
                      </div>
                    );
                  })}

                  {/* Time Totals */}
                  {missionLog?.startTravelTime && (
                    <div className="border-t pt-3 mt-3 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Travel Time</span>
                        <span className="font-medium">
                          {(() => {
                            let travelMinutes = 0;
                            if (missionLog.startTravelTime && missionLog.arriveSiteTime) {
                              travelMinutes += Math.round((new Date(missionLog.arriveSiteTime).getTime() - new Date(missionLog.startTravelTime).getTime()) / 60000);
                            }
                            if (missionLog.leaveSiteTime && missionLog.arriveHomeTime) {
                              travelMinutes += Math.round((new Date(missionLog.arriveHomeTime).getTime() - new Date(missionLog.leaveSiteTime).getTime()) / 60000);
                            }
                            const hours = Math.floor(travelMinutes / 60);
                            const mins = travelMinutes % 60;
                            return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
                          })()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">On-Site Time</span>
                        <span className="font-medium">
                          {(() => {
                            if (!missionLog.arriveSiteTime) return "0m";
                            const endTime = missionLog.leaveSiteTime ? new Date(missionLog.leaveSiteTime) : new Date();
                            const siteMinutes = Math.round((endTime.getTime() - new Date(missionLog.arriveSiteTime).getTime()) / 60000);
                            const hours = Math.floor(siteMinutes / 60);
                            const mins = siteMinutes % 60;
                            return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
                          })()}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Data Handover - visible after Leave Site */}
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
                      </div>
                    ) : (
                      <>
                        <p className="text-xs text-muted-foreground">
                          Upload video walkthroughs, scan data, and site photos.
                        </p>
                        
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileSelect}
                          accept="video/*,image/*,.rcs,.rcp,.e57,.las,.laz,.pts"
                          multiple
                          className="hidden"
                          data-testid="input-handover-files"
                        />
                        
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => fileInputRef.current?.click()}
                          data-testid="button-add-media"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Site Media
                        </Button>
                        
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
                                    placeholder="Area description"
                                    value={hf.areaDescription}
                                    onChange={(e) => updateFileDescription(index, e.target.value)}
                                    className="mt-1 h-7 text-xs"
                                    data-testid={`input-area-desc-${index}`}
                                  />
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => removeHandoverFile(index)}
                                  data-testid={`button-remove-file-${index}`}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {handoverMutation.isPending && (
                          <div className="space-y-2">
                            <Progress value={uploadProgress} className="h-2" />
                            <p className="text-xs text-center text-muted-foreground">Uploading...</p>
                          </div>
                        )}
                        
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
                            Upload {handoverFiles.length} File{handoverFiles.length !== 1 ? "s" : ""}
                          </Button>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {activeTab === "checklist" && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Scope Checklist
                  </span>
                  <Badge variant="outline">{completedCount}/{totalCount}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(
                  scopeChecklist.reduce((acc, item) => {
                    if (!acc[item.category]) acc[item.category] = [];
                    acc[item.category].push(item);
                    return acc;
                  }, {} as Record<string, ScopeChecklistItem[]>)
                ).map(([category, items]) => (
                  <div key={category}>
                    <p className={`text-xs font-medium mb-2 ${category === "Required" ? "text-destructive" : "text-muted-foreground"}`}>
                      {category} {category === "Required" && "(Hard Gate)"}
                    </p>
                    <div className="space-y-2">
                      {items.map((item) => (
                        <div 
                          key={item.id} 
                          className="flex items-start gap-2 p-2 bg-muted/30 rounded-md"
                          data-testid={`checklist-item-${item.id}`}
                        >
                          <Checkbox
                            checked={item.completed}
                            onCheckedChange={() => toggleChecklistItem(item.id)}
                            id={item.id}
                            data-testid={`checkbox-${item.id}`}
                          />
                          <label 
                            htmlFor={item.id}
                            className={`text-sm cursor-pointer ${item.completed ? "line-through text-muted-foreground" : ""}`}
                          >
                            {item.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {activeTab === "expenses" && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
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
                        <SelectItem key={cat} value={cat}>
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

                {expenses.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-2">Project Expenses</p>
                    <div className="space-y-1">
                      {expenses.map((exp) => (
                        <div key={exp.id} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{exp.category}</span>
                          <span className="font-medium">${parseFloat(exp.amount).toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between text-sm font-semibold border-t pt-1">
                        <span>Total</span>
                        <span data-testid="text-expense-total">
                          ${expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
