import { Clock, Camera, Mic, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuickActionsProps {
    onClockIn: () => void;
    onCapture: () => void;
    onVoiceNote: () => void;
    onEscalate: () => void;
    isClockedIn: boolean;
}

export function QuickActions({
    onClockIn,
    onCapture,
    onVoiceNote,
    onEscalate,
    isClockedIn
}: QuickActionsProps) {
    return (
        <div className="grid grid-cols-2 gap-4 p-4">
            <Button
                variant={isClockedIn ? "outline" : "default"}
                className="h-24 flex flex-col gap-2 text-lg shadow-sm"
                onClick={onClockIn}
            >
                <Clock className="w-8 h-8" />
                {isClockedIn ? "Clock Out" : "Clock In"}
            </Button>

            <Button
                variant="secondary"
                className="h-24 flex flex-col gap-2 text-lg shadow-sm"
                onClick={onCapture}
            >
                <Camera className="w-8 h-8" />
                Capture
            </Button>

            <Button
                variant="secondary"
                className="h-24 flex flex-col gap-2 text-lg shadow-sm"
                onClick={onVoiceNote}
            >
                <Mic className="w-8 h-8" />
                Voice Note
            </Button>

            <Button
                variant="destructive"
                className="h-24 flex flex-col gap-2 text-lg bg-red-100 text-red-900 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-300 shadow-sm"
                onClick={onEscalate}
            >
                <AlertTriangle className="w-8 h-8" />
                Escalate
            </Button>
        </div>
    );
}
