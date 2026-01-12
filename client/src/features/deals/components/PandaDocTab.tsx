import { TabsContent } from "@/components/ui/tabs";
import { PandaDocEmbed } from "@/components/PandaDocEmbed";
import type { QueryClient } from "@tanstack/react-query";

interface PandaDocTabProps {
  pandaDocId: string | null;
  documentName?: string;
  leadId: number;
  quoteId?: number;
  queryClient: QueryClient;
  onOpenSendDialog?: () => void;
  proposalEmails?: Array<{ openCount: number | null; sentAt: Date | null }>;
}

export function PandaDocTab({
  pandaDocId,
  documentName,
  leadId,
  quoteId,
  queryClient,
  onOpenSendDialog,
  proposalEmails,
}: PandaDocTabProps) {
  return (
    <TabsContent value="pandadoc" className="flex-1 overflow-hidden m-0">
      <PandaDocEmbed
        pandaDocId={pandaDocId}
        documentName={documentName}
        leadId={leadId}
        quoteId={quoteId}
        onDocumentCreated={() => {
          queryClient.invalidateQueries({ queryKey: ['/api/leads', leadId] });
        }}
        onDocumentSent={() => {
          queryClient.invalidateQueries({ queryKey: ['/api/leads', leadId] });
        }}
        onOpenSendDialog={onOpenSendDialog}
        proposalEmails={proposalEmails}
      />
    </TabsContent>
  );
}
