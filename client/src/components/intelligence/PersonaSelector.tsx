import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BuyerPersona } from "@shared/schema";

interface PersonaSelectorProps {
  onSelect: (persona: BuyerPersona) => void;
  selected?: string;
}

const personaColors: Record<string, string> = {
  'BP-A': 'border-l-blue-500',
  'BP-B': 'border-l-green-500',
  'BP-C': 'border-l-purple-500',
  'BP-D': 'border-l-orange-500',
};

const personaIcons: Record<string, string> = {
  'BP-A': 'Design Principal',
  'BP-B': 'Project Architect',
  'BP-C': 'Owner Rep',
  'BP-D': 'GC / CM',
};

export function PersonaSelector({ onSelect, selected }: PersonaSelectorProps) {
  const { data: personas, isLoading } = useQuery<BuyerPersona[]>({
    queryKey: ["/api/intelligence/personas"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold">
        Who is this for?
      </label>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {personas?.map(persona => (
          <button
            key={persona.code}
            onClick={() => onSelect(persona)}
            data-testid={`persona-select-${persona.code}`}
            className={cn(
              "text-left p-4 rounded-lg border-l-4 transition-all",
              personaColors[persona.code] || 'border-l-gray-500',
              selected === persona.code 
                ? 'bg-accent ring-2 ring-primary' 
                : 'bg-card hover-elevate'
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs">{persona.code}</Badge>
              <span className="font-semibold text-sm">{persona.roleTitle}</span>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-1">
              {personaIcons[persona.code]}
            </p>
          </button>
        ))}
      </div>

      {selected && personas && (
        <Card className={cn("mt-4", personaColors[selected])}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Strategy Focus</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {personas.filter(p => p.code === selected).map(p => (
              <div key={p.code} className="space-y-2">
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Their Pain:</span>
                  <p className="text-sm">{p.primaryPain}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Lead With:</span>
                  <p className="text-sm">{p.valueDriver}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(p.emotionalTriggers as string[] || []).slice(0, 4).map((trigger) => (
                    <Badge 
                      key={trigger}
                      variant="secondary"
                      className="text-xs"
                    >
                      {trigger}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
