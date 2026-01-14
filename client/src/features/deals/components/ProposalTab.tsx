import { ScrollArea } from "@/components/ui/scroll-area";
import { DealAIAssistant } from "@/components/DealAIAssistant";
import type { Lead } from "@shared/schema";

interface ProposalTabProps {
  lead: Lead;
}

export function ProposalTab({ lead }: ProposalTabProps) {
  return (
    <ScrollArea className="h-full flex-1">
      <div className="pt-2 px-4 pb-4">
        <DealAIAssistant lead={lead} />
      </div>
    </ScrollArea>
  );
}
