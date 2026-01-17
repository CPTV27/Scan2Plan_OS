import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Upload, FileText, CheckCircle, AlertTriangle } from "lucide-react";

interface RFPAnalysisResult {
  success: boolean;
  rfp: {
    id: number;
    status: string;
  };
  analysis: {
    clientName?: string;
    projectName?: string;
    projectAddress?: string;
    buildingType?: string;
    sqft?: number;
    scope?: string;
    deadline?: string;
    budgetHint?: string;
    confidence: number;
    summary: string;
    keyRequirements?: string[];
    unusualRequirements?: string[];
    complianceNeeds?: string[];
  };
  leadData: any;
  suggestions: {
    suggestedValue?: number;
    lodLevel?: string;
    disciplines?: string[];
    needsResearch: boolean;
    warnings: string[];
  };
  meta: {
    textLength: number;
    processingTime: number;
    filename: string;
  };
}

export function RFPUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<RFPAnalysisResult | null>(null);
  const navigate = useNavigate();

  const analyzeMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("rfp", file);

      const response = await fetch("/api/rfp/analyze-pdf", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to analyze RFP");
      }

      return response.json() as Promise<RFPAnalysisResult>;
    },
    onSuccess: (data) => {
      setAnalysis(data);
    },
  });

  const createLeadMutation = useMutation({
    mutationFn: async () => {
      if (!analysis) return;

      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(analysis.leadData),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create lead");
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Navigate to the new lead
      navigate(`/sales/${data.id}`);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
      setAnalysis(null); // Clear previous analysis
    }
  };

  const handleAnalyze = () => {
    if (file) {
      analyzeMutation.mutate(file);
    }
  };

  const handleCreateLead = () => {
    createLeadMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            RFP Analyzer
          </CardTitle>
          <CardDescription>
            Upload an RFP PDF to automatically extract requirements, timeline, and budget.
            Analysis takes ~30 seconds.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Select RFP PDF
            </label>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium"
              />
              {file && (
                <span className="text-sm text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </span>
              )}
            </div>
          </div>

          {/* Analyze Button */}
          <Button
            onClick={handleAnalyze}
            disabled={!file || analyzeMutation.isPending}
            className="w-full"
          >
            {analyzeMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing RFP...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Analyze RFP
              </>
            )}
          </Button>

          {/* Error */}
          {analyzeMutation.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                {analyzeMutation.error.message}
              </AlertDescription>
            </Alert>
          )}

          {/* Success - Analysis Results */}
          {analysis && (
            <div className="space-y-4 p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Analysis Complete
                </h3>
                <span className="text-sm text-muted-foreground">
                  {(analysis.meta.processingTime / 1000).toFixed(1)}s
                </span>
              </div>

              {/* Confidence Badge */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Confidence:</span>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    analysis.analysis.confidence >= 80
                      ? "bg-green-100 text-green-800"
                      : analysis.analysis.confidence >= 60
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {analysis.analysis.confidence}%
                </span>
              </div>

              {/* Summary */}
              <div>
                <p className="text-sm font-medium mb-1">Summary:</p>
                <p className="text-sm text-muted-foreground">
                  {analysis.analysis.summary}
                </p>
              </div>

              {/* Extracted Data */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {analysis.analysis.clientName && (
                  <div>
                    <span className="font-medium">Client:</span>{" "}
                    {analysis.analysis.clientName}
                  </div>
                )}
                {analysis.analysis.projectName && (
                  <div>
                    <span className="font-medium">Project:</span>{" "}
                    {analysis.analysis.projectName}
                  </div>
                )}
                {analysis.analysis.buildingType && (
                  <div>
                    <span className="font-medium">Type:</span>{" "}
                    {analysis.analysis.buildingType}
                  </div>
                )}
                {analysis.analysis.sqft && (
                  <div>
                    <span className="font-medium">SQFT:</span>{" "}
                    {analysis.analysis.sqft.toLocaleString()}
                  </div>
                )}
                {analysis.analysis.deadline && (
                  <div>
                    <span className="font-medium">Deadline:</span>{" "}
                    {analysis.analysis.deadline}
                  </div>
                )}
                {analysis.analysis.budgetHint && (
                  <div>
                    <span className="font-medium">Budget:</span>{" "}
                    {analysis.analysis.budgetHint}
                  </div>
                )}
              </div>

              {/* Warnings */}
              {analysis.suggestions.warnings.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      {analysis.suggestions.warnings.map((warning, idx) => (
                        <div key={idx}>{warning}</div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Key Requirements */}
              {analysis.analysis.keyRequirements &&
                analysis.analysis.keyRequirements.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Key Requirements:</p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      {analysis.analysis.keyRequirements.map((req, idx) => (
                        <li key={idx}>{req}</li>
                      ))}
                    </ul>
                  </div>
                )}

              {/* Create Lead Button */}
              <Button
                onClick={handleCreateLead}
                disabled={createLeadMutation.isPending}
                className="w-full"
                variant="default"
              >
                {createLeadMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Lead...
                  </>
                ) : (
                  "Create Lead & Open CPQ"
                )}
              </Button>

              {createLeadMutation.isError && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {createLeadMutation.error.message}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats (if analysis exists) */}
      {analysis && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Analysis Details</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">File:</span>
              <span className="font-medium">{analysis.meta.filename}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Text Length:</span>
              <span className="font-medium">
                {(analysis.meta.textLength / 1000).toFixed(1)}K chars
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Processing Time:</span>
              <span className="font-medium">
                {(analysis.meta.processingTime / 1000).toFixed(1)}s
              </span>
            </div>
            {analysis.suggestions.suggestedValue && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Suggested Quote:</span>
                <span className="font-medium">
                  ${analysis.suggestions.suggestedValue.toLocaleString()}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
