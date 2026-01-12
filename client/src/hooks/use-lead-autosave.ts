import { useEffect, useRef, useState, useCallback } from "react";
import { UseFormReturn } from "react-hook-form";
import { useUpdateLead } from "./use-leads";
import type { LeadFormData } from "@/features/deals/types";

export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

interface UseLeadAutosaveOptions {
  leadId: number;
  form: UseFormReturn<LeadFormData>;
  debounceMs?: number;
  enabled?: boolean;
}

interface UseLeadAutosaveReturn {
  status: AutosaveStatus;
  lastSavedAt: Date | null;
  error: string | null;
  retry: () => void;
}

export function useLeadAutosave({
  leadId,
  form,
  debounceMs = 1500,
  enabled = true,
}: UseLeadAutosaveOptions): UseLeadAutosaveReturn {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const updateMutation = useUpdateLead();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingDataRef = useRef<Partial<LeadFormData> | null>(null);
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const saveData = useCallback(async (data: Partial<LeadFormData>) => {
    if (!isMountedRef.current) return;
    
    setStatus("saving");
    setError(null);
    
    try {
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined)
      );
      
      await updateMutation.mutateAsync({ id: leadId, ...cleanData });
      
      if (isMountedRef.current) {
        setStatus("saved");
        setLastSavedAt(new Date());
        pendingDataRef.current = null;
        
        setTimeout(() => {
          if (isMountedRef.current && status === "saved") {
            setStatus("idle");
          }
        }, 2000);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Failed to save");
        pendingDataRef.current = data;
      }
    }
  }, [leadId, updateMutation, status]);

  const retry = useCallback(() => {
    if (pendingDataRef.current) {
      saveData(pendingDataRef.current);
    }
  }, [saveData]);

  useEffect(() => {
    if (!enabled) return;

    const subscription = form.watch((formValues, { name }) => {
      if (!name || !form.formState.isDirty) return;
      
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      debounceTimerRef.current = setTimeout(() => {
        const dirtyFields = form.formState.dirtyFields;
        const changedData: Partial<LeadFormData> = {};
        
        Object.keys(dirtyFields).forEach((key) => {
          const fieldKey = key as keyof LeadFormData;
          if (dirtyFields[fieldKey]) {
            changedData[fieldKey] = formValues[fieldKey] as any;
          }
        });
        
        if (Object.keys(changedData).length > 0) {
          saveData(changedData);
        }
      }, debounceMs);
    });

    return () => {
      subscription.unsubscribe();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [form, enabled, debounceMs, saveData]);

  return {
    status,
    lastSavedAt,
    error,
    retry,
  };
}
