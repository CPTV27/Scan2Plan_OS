import { ReactNode } from "react";
import { Home, Clock, Camera, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface FieldMobileLayoutProps {
    children: ReactNode;
    activeTab: string;
    onTabChange: (tab: string) => void;
}

export function FieldMobileLayout({ children, activeTab, onTabChange }: FieldMobileLayoutProps) {
    return (
        <div className="flex flex-col h-[100dvh] bg-background">
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
                {children}
            </div>

            <div className="border-t bg-card pb-safe shadow-[0_-1px_3px_rgba(0,0,0,0.1)] z-50">
                <div className="flex items-center justify-around h-16">
                    <NavButton
                        active={activeTab === "home"}
                        onClick={() => onTabChange("home")}
                        icon={<Home className="w-6 h-6" />}
                        label="Home"
                    />
                    <NavButton
                        active={activeTab === "time"}
                        onClick={() => onTabChange("time")}
                        icon={<Clock className="w-6 h-6" />}
                        label="Time"
                    />
                    <NavButton
                        active={activeTab === "capture"}
                        onClick={() => onTabChange("capture")}
                        icon={<Camera className="w-6 h-6" />}
                        label="Capture"
                    />
                    <NavButton
                        active={activeTab === "chat"}
                        onClick={() => onTabChange("chat")}
                        icon={<MessageSquare className="w-6 h-6" />}
                        label="Chat"
                    />
                </div>
            </div>
        </div>
    );
}

function NavButton({ active, onClick, icon, label }: any) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors active:scale-95 touch-manipulation",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
        >
            {icon}
            <span className="text-[10px] font-medium">{label}</span>
        </button>
    );
}
