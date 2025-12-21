import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import ResumeUpload from "../ResumeUpload";
import type { MockInterviewStepProps } from "../../types/mockInterviewTypes";

export const ResumeStep = ({ state, setState, onNext }: MockInterviewStepProps) => {
    const handleResumeExtracted = (text: string) => {
        setState(prev => ({ ...prev, resumeText: text }));
        localStorage.setItem('behavioral_mock_interview_resume', text);
    };

    const handleContinue = () => {
        if (!state.resumeText.trim()) {
            return;
        }
        onNext?.();
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Step 1: Upload Your Resume</CardTitle>
                <CardDescription>
                    Upload your resume so we can generate personalized interview questions
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <ResumeUpload onResumeExtracted={handleResumeExtracted} />
                {state.resumeText && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span>Resume loaded from previous session. You can upload a different one if needed.</span>
                    </div>
                )}
                <Button
                    onClick={handleContinue}
                    disabled={!state.resumeText.trim()}
                    className="w-full"
                >
                    Continue
                </Button>
            </CardContent>
        </Card>
    );
};
