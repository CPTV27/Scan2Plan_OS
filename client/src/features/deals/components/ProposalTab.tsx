import { ScrollArea } from "@/components/ui/scroll-area";
import { DealAIAssistant } from "@/components/DealAIAssistant";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileEdit, Sparkles } from "lucide-react";
import { useLocation } from "wouter";
import type { Lead } from "@shared/schema";

interface ProposalTabProps {
  lead: Lead;
}

export function ProposalTab({ lead }: ProposalTabProps) {
  const [, navigate] = useLocation();

  return (
    <ScrollArea className="h-full flex-1">
      <div className="p-4 space-y-4">
        {/* Proposal Builder Entry Point */}
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileEdit className="w-5 h-5 text-primary" />
              Proposal Builder
            </CardTitle>
            <CardDescription>
              Create and customize professional proposals with our split-pane editor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => navigate(`/deals/${lead.id}/proposal`)}
              className="gap-2"
              data-testid="button-open-proposal-builder"
            >
              <Sparkles className="w-4 h-4" />
              Open Proposal Builder
            </Button>
          </CardContent>
        </Card>

        {/* AI Assistant */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              AI Proposal Assistant
            </CardTitle>
            <CardDescription>
              Get AI help with proposal content, answers, and suggestions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DealAIAssistant lead={lead} />
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
