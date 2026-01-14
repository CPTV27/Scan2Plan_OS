/**
 * ProposalLayoutEditor Component
 * 
 * Main layout editor with split panels:
 * - Left: Section selection with dropdowns
 * - Right: Live proposal preview
 */

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    ResizablePanelGroup,
    ResizablePanel,
    ResizableHandle,
} from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Download,
    Send,
    Save,
    Loader2,
    ArrowLeft,
    Building2,
    DollarSign,
    LayoutTemplate,
} from "lucide-react";
import type { Lead, CpqQuote, ProposalTemplate, ProposalTemplateGroup } from "@shared/schema";
import { SectionPanel } from "./SectionPanel";
import { ProposalPreview } from "./ProposalPreview";
import {
    ProposalSection,
    substituteVariables,
    useTemplateGroups,
    CATEGORY_ORDER,
} from "../hooks/useProposalTemplates";

interface ProposalLayoutEditorProps {
    lead: Lead;
    quote: CpqQuote | null;
    onBack: () => void;
    onSend: () => Promise<void>;
    onDownloadPDF: () => Promise<void>;
    isSending?: boolean;
}

// Format currency helper
function formatCurrency(value: number | string | null | undefined): string {
    const num = Number(value) || 0;
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(num);
}

interface ExpandedSection {
    templateId: number;
    sortOrder: number;
    required: boolean;
    template: ProposalTemplate;
}

interface ExpandedTemplateGroup extends ProposalTemplateGroup {
    expandedSections: ExpandedSection[];
}

export function ProposalLayoutEditor({
    lead,
    quote,
    onBack,
    onSend,
    onDownloadPDF,
    isSending = false,
}: ProposalLayoutEditorProps) {
    const [activeSectionId, setActiveSectionId] = useState<string | undefined>();
    const [sections, setSections] = useState<ProposalSection[]>([]);
    const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);

    // Fetch template groups
    const { data: templateGroups = [], isLoading: groupsLoading } = useTemplateGroups();

    // Fetch grouped templates for dropdown menus
    const { data: groupedTemplates = {}, isLoading: templatesLoading } = useQuery<
        Record<string, ProposalTemplate[]>
    >({
        queryKey: ["/api/proposal-templates/grouped"],
    });

    // Fetch selected template group with expanded sections
    const { data: selectedGroup, isLoading: groupLoading } = useQuery<ExpandedTemplateGroup>({
        queryKey: ["/api/proposal-template-groups", selectedGroupId],
        enabled: !!selectedGroupId,
    });

    // Auto-select default group on load
    useEffect(() => {
        if (templateGroups.length > 0 && !selectedGroupId) {
            const defaultGroup = templateGroups.find(g => g.isDefault) || templateGroups[0];
            setSelectedGroupId(defaultGroup.id);
        }
    }, [templateGroups, selectedGroupId]);

    // Build sections when group loads
    useEffect(() => {
        if (selectedGroup?.expandedSections && selectedGroup.expandedSections.length > 0) {
            const context = { lead, quote };
            const newSections: ProposalSection[] = selectedGroup.expandedSections.map(
                (section, idx) => ({
                    id: `section-${section.templateId}-${idx}`,
                    templateId: section.templateId,
                    category: section.template.category || "other",
                    name: section.template.name,
                    content: substituteVariables(section.template.content, context),
                    sortOrder: section.sortOrder,
                    included: true,
                })
            );
            setSections(newSections);
        }
    }, [selectedGroup, lead, quote]);

    // Re-substitute variables when sections change template
    const handleSectionsChange = (newSections: ProposalSection[]) => {
        const context = { lead, quote };
        const updated = newSections.map(s => {
            // Find the template to get fresh content
            const categoryTemplates = groupedTemplates[s.category] || [];
            const template = categoryTemplates.find(t => t.id === s.templateId);
            if (template && s.content === template.content) {
                // Need to substitute
                return { ...s, content: substituteVariables(template.content, context) };
            }
            return s;
        });
        setSections(updated);
    };

    // Handle template group change
    const handleGroupChange = (groupId: string) => {
        setSelectedGroupId(Number(groupId));
    };

    // Handle section click for scroll sync
    const handleSectionClick = (sectionId: string) => {
        setActiveSectionId(sectionId);
    };

    // Handle PDF download
    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            await onDownloadPDF();
        } finally {
            setIsDownloading(false);
        }
    };

    // Sort grouped templates by category order
    const sortedGroupedTemplates = useMemo(() => {
        const sorted: Record<string, ProposalTemplate[]> = {};
        for (const cat of CATEGORY_ORDER) {
            if (groupedTemplates[cat]) {
                sorted[cat] = groupedTemplates[cat];
            }
        }
        // Add any remaining categories
        for (const cat of Object.keys(groupedTemplates)) {
            if (!sorted[cat]) {
                sorted[cat] = groupedTemplates[cat];
            }
        }
        return sorted;
    }, [groupedTemplates]);

    const isLoading = groupsLoading || templatesLoading;

    if (isLoading) {
        return (
            <div className="h-full flex flex-col">
                <div className="border-b p-4">
                    <Skeleton className="h-8 w-48" />
                </div>
                <div className="flex-1 p-4">
                    <Skeleton className="h-full w-full" />
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
                <div className="flex items-center justify-between gap-4 p-4">
                    {/* Left: Back button and title */}
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={onBack}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                            <h1 className="text-lg font-semibold">Proposal Builder</h1>
                            <p className="text-sm text-muted-foreground">{lead.clientName}</p>
                        </div>
                    </div>

                    {/* Center: Template group selector */}
                    <div className="flex items-center gap-2">
                        <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
                        <Select
                            value={selectedGroupId ? String(selectedGroupId) : undefined}
                            onValueChange={handleGroupChange}
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select template..." />
                            </SelectTrigger>
                            <SelectContent>
                                {templateGroups.map((group) => (
                                    <SelectItem key={group.id} value={String(group.id)}>
                                        {group.name}
                                        {group.isDefault && (
                                            <Badge variant="secondary" className="ml-2 text-[10px]">
                                                Default
                                            </Badge>
                                        )}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Right: Deal info and actions */}
                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className="gap-1">
                            <Building2 className="h-3 w-3" />
                            {lead.buildingType || "Unknown"}
                        </Badge>
                        {quote && (
                            <Badge variant="secondary" className="gap-1">
                                <DollarSign className="h-3 w-3" />
                                {formatCurrency(quote.totalPrice)}
                            </Badge>
                        )}

                        <div className="flex items-center gap-2 ml-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDownload}
                                disabled={isDownloading}
                            >
                                {isDownloading ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <Download className="h-4 w-4 mr-2" />
                                )}
                                Download PDF
                            </Button>
                            <Button size="sm" onClick={onSend} disabled={isSending}>
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
                    </div>
                </div>
            </div>

            {/* Split Panel Editor */}
            <div className="flex-1 min-h-0 overflow-hidden">
                <ResizablePanelGroup direction="horizontal" className="h-full">
                    {/* Left Panel: Section List */}
                    <ResizablePanel defaultSize={25} minSize={20} maxSize={35} className="flex flex-col h-full">
                        <div className="h-full p-3 overflow-hidden">
                            <SectionPanel
                                sections={sections}
                                onSectionsChange={handleSectionsChange}
                                groupedTemplates={sortedGroupedTemplates}
                                onSectionClick={handleSectionClick}
                                activeSectionId={activeSectionId}
                            />
                        </div>
                    </ResizablePanel>

                    <ResizableHandle withHandle />

                    {/* Right Panel: Live Preview */}
                    <ResizablePanel defaultSize={75} className="flex flex-col h-full">
                        <div className="h-full p-3 pl-0 overflow-hidden">
                            <ProposalPreview
                                sections={sections}
                                activeSectionId={activeSectionId}
                            />
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>
        </div>
    );
}
