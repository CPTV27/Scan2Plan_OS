import { TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DealAIAssistant } from "@/components/DealAIAssistant";
import type { Lead } from "@shared/schema";

interface ProposalTabProps {
  lead: Lead;
}

export function ProposalTab({ lead }: ProposalTabProps) {
  return (
    <TabsContent value="proposal" className="flex-1 overflow-hidden m-0">
      <ScrollArea className="h-full">
        <div className="pt-2 px-4 pb-4">
          <DealAIAssistant lead={lead} />
        </div>
      </ScrollArea>
    </TabsContent>
  );
}
