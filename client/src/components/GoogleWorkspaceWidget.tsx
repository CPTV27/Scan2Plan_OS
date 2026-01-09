import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  Mail, 
  Calendar, 
  RefreshCw, 
  Loader2, 
  ExternalLink,
  Clock,
  MapPin,
  Send
} from "lucide-react";
import { format, parseISO, isToday, isTomorrow } from "date-fns";

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  htmlLink: string;
}

function formatEventTime(startStr: string, endStr: string) {
  try {
    const start = parseISO(startStr);
    const end = parseISO(endStr);
    
    let prefix = "";
    if (isToday(start)) prefix = "Today";
    else if (isTomorrow(start)) prefix = "Tomorrow";
    else prefix = format(start, "MMM d");
    
    return `${prefix}, ${format(start, "h:mm a")} - ${format(end, "h:mm a")}`;
  } catch {
    return startStr;
  }
}

export function GoogleWorkspaceWidget() {
  const { toast } = useToast();
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  const { data: calendarData, isLoading: calendarLoading, refetch: refetchCalendar, isFetching: calendarFetching } = useQuery<{ events: CalendarEvent[] }>({
    queryKey: ["/api/google/calendar/events"],
    staleTime: 5 * 60 * 1000,
  });

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

  const isLoading = calendarLoading;
  const isFetching = calendarFetching;

  const handleRefresh = () => {
    refetchCalendar();
  };

  return (
    <Card className="border-border shadow-md">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/10">
            <Mail className="h-4 w-4 text-primary" />
          </div>
          Google Workspace
        </CardTitle>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={handleRefresh}
          disabled={isFetching}
          data-testid="button-refresh-google"
        >
          {isFetching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="emails" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-3">
              <TabsTrigger value="emails" className="gap-1.5" data-testid="tab-emails">
                <Send className="h-3.5 w-3.5" />
                Email
              </TabsTrigger>
              <TabsTrigger value="calendar" className="gap-1.5" data-testid="tab-calendar">
                <Calendar className="h-3.5 w-3.5" />
                Calendar
              </TabsTrigger>
            </TabsList>

            <TabsContent value="emails" className="mt-0">
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
            </TabsContent>

            <TabsContent value="calendar" className="mt-0">
              <ScrollArea className="h-[280px]">
                {calendarData?.events && calendarData.events.length > 0 ? (
                  <div className="space-y-2 pr-3">
                    {calendarData.events.slice(0, 8).map((event) => (
                      <div
                        key={event.id}
                        className="p-2.5 rounded-lg bg-muted/50 hover-elevate"
                        data-testid={`calendar-event-${event.id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium truncate flex-1">
                            {event.summary || "(No title)"}
                          </p>
                          {event.htmlLink && (
                            <a
                              href={event.htmlLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-foreground"
                              data-testid={`link-event-${event.id}`}
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatEventTime(event.start, event.end)}
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{event.location}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Calendar className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">No upcoming events</p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
