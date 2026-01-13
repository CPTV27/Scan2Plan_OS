import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, Loader2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface ChatButtonProps {
    projectId: number;
    spaceUrl?: string; // If already exists
    variant?: "default" | "outline" | "ghost" | "secondary";
    size?: "default" | "sm" | "icon";
    showLabel?: boolean;
}

export function ChatButton({ projectId, spaceUrl, variant = "outline", size = "sm", showLabel = true }: ChatButtonProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isLoading, setIsLoading] = useState(false);

    const createSpaceMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch("/api/chat/space", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ projectId }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to create space");
            }
            return res.json();
        },
        onSuccess: (data) => {
            toast({ title: "Success", description: "Project Space created!" });
            queryClient.invalidateQueries({ queryKey: ["projects"] }); // Refresh projects to get new URL
            // Open immediately
            if (data.spaceUrl) {
                window.open(data.spaceUrl, "_blank");
            }
        },
        onError: (err) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        },
    });

    const handleClick = () => {
        if (spaceUrl) {
            window.open(spaceUrl, "_blank");
        } else {
            createSpaceMutation.mutate();
        }
    };

    const isPending = createSpaceMutation.isPending;

    if (spaceUrl) {
        return (
            <Button variant={variant} size={size} onClick={handleClick} className="gap-2">
                <MessageSquare className="h-4 w-4 text-green-600" />
                {showLabel && "Open Chat"}
            </Button>
        );
    }

    return (
        <Button variant={variant} size={size} onClick={handleClick} disabled={isPending} className="gap-2">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
            {showLabel && "Create Chat"}
        </Button>
    );
}
