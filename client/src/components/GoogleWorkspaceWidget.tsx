import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Mail, 
  Loader2, 
  Send
} from "lucide-react";

export function GoogleWorkspaceWidget() {
  const { toast } = useToast();
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  const sendEmailMutation = useMutation({
    mutationFn: async (data: { to: string; subject: string; body: string }) => {
      const res = await apiRequest("POST", "/api/google/gmail/send", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Email sent", description: "Your message was sent successfully." });
      setEmailTo("");
      setEmailSubject("");
      setEmailBody("");
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to send", 
        description: error.message || "Could not send email.",
        variant: "destructive"
      });
    }
  });

  const handleSendEmail = () => {
    if (!emailTo || !emailSubject || !emailBody) {
      toast({ title: "Missing fields", description: "Please fill in all email fields.", variant: "destructive" });
      return;
    }
    sendEmailMutation.mutate({ to: emailTo, subject: emailSubject, body: emailBody });
  };

  return (
    <Card className="border-border shadow-md">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/10">
            <Mail className="h-4 w-4 text-primary" />
          </div>
          Quick Email
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <Input
            placeholder="To: client@example.com"
            value={emailTo}
            onChange={(e) => setEmailTo(e.target.value)}
            className="text-sm"
            data-testid="input-email-to"
          />
          <Input
            placeholder="Subject"
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
            className="text-sm"
            data-testid="input-email-subject"
          />
          <Textarea
            placeholder="Message body..."
            value={emailBody}
            onChange={(e) => setEmailBody(e.target.value)}
            className="text-sm min-h-[120px] resize-none"
            data-testid="input-email-body"
          />
          <Button
            onClick={handleSendEmail}
            disabled={sendEmailMutation.isPending || !emailTo || !emailSubject || !emailBody}
            className="w-full gap-2"
            data-testid="button-send-email"
          >
            {sendEmailMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send Email
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
