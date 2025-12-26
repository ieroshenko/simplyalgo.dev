import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import type { MockInterviewStepProps } from "../../types/mockInterviewTypes";

interface DetailsStepProps extends MockInterviewStepProps {
    onStartInterview: () => Promise<void>;
    isGeneratingQuestions: boolean;
}

export const DetailsStep = ({
    state,
    setState,
    onStartInterview,
    isGeneratingQuestions
}: DetailsStepProps) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Step 2: Interview Details</CardTitle>
                <CardDescription>
                    Tell us about the role and company you're interviewing with
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="role">Role *</Label>
                    <Input
                        id="role"
                        placeholder="e.g., Senior Software Engineer, Product Manager, etc."
                        value={state.role}
                        onChange={(e) => setState(prev => ({ ...prev, role: e.target.value }))}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="company">Company (Optional)</Label>
                    <Input
                        id="company"
                        placeholder='e.g., Google, or "growth-stage tech startup that does xyz"'
                        value={state.company}
                        onChange={(e) => setState(prev => ({ ...prev, company: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">
                        You can enter a specific company name or describe the type of company
                    </p>
                </div>
                <Button
                    onClick={onStartInterview}
                    disabled={!state.role.trim() || isGeneratingQuestions}
                    className="w-full"
                >
                    {isGeneratingQuestions ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Generating Questions...
                        </>
                    ) : (
                        "Start Interview"
                    )}
                </Button>
            </CardContent>
        </Card>
    );
};
