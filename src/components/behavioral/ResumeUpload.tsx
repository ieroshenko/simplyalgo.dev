import { useState, useRef } from "react";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface ResumeUploadProps {
  onResumeExtracted: (text: string) => void;
  disabled?: boolean;
}

const ResumeUpload = ({ onResumeExtracted, disabled }: ResumeUploadProps) => {
  const [fileName, setFileName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain"
    ];
    const validExtensions = [".pdf", ".docx", ".txt"];
    const hasValidType = validTypes.includes(file.type);
    const hasValidExtension = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

    if (!hasValidType && !hasValidExtension) {
      setError("Please upload a PDF, DOCX, or TXT file");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB");
      return;
    }

    setFileName(file.name);
    setError("");
    setIsLoading(true);

    try {
      const text = await parseResumeViaBackend(file);
      onResumeExtracted(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to extract text from file");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const parseResumeViaBackend = async (file: File): Promise<string> => {
    try {
      // Create FormData to send file
      const formData = new FormData();
      formData.append("file", file);

      // Get Supabase URL and anon key from environment variables
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Missing Supabase configuration. Please check your environment variables.");
      }

      // Call Supabase edge function directly with fetch (for FormData support)
      const response = await fetch(
        `${supabaseUrl}/functions/v1/upload-resume`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to parse resume" }));
        throw new Error(errorData.error || "Failed to parse resume");
      }

      const data = await response.json();

      if (!data?.text) {
        throw new Error("No text extracted from resume");
      }

      return data.text;
    } catch (err) {
      console.error("Error parsing resume:", err);
      throw err;
    }
  };

  const handleRemove = () => {
    setFileName("");
    setError("");
    onResumeExtracted("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.txt"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />

      {!fileName ? (
        <Card
          onClick={handleClick}
          className={`border-2 border-dashed p-8 text-center transition-all ${
            disabled
              ? "opacity-50 cursor-not-allowed"
              : "cursor-pointer hover:border-primary hover:bg-accent"
          }`}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Upload Resume</p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, DOCX, or TXT - max 10MB
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isLoading ? (
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              ) : (
                <FileText className="w-5 h-5 text-primary" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {isLoading ? "Extracting text..." : "Ready"}
                </p>
              </div>
            </div>
            {!disabled && !isLoading && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRemove}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </Card>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
};

export default ResumeUpload;
