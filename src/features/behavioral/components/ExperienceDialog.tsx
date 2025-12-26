/**
 * Experience Selection Dialog component for behavioral practice
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Copy, Check } from "lucide-react";
import { logger } from "@/utils/logger";
import type { UserStory } from "@/types";

interface ExperienceDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    stories: UserStory[];
    selectedStory: string | null;
    onSelectStory: (storyId: string | null) => void;
}

export const ExperienceDialog: React.FC<ExperienceDialogProps> = ({
    isOpen,
    onOpenChange,
    stories,
    selectedStory,
    onSelectStory,
}) => {
    const [copiedStoryId, setCopiedStoryId] = useState<string | null>(null);

    const handleCopyStory = async (story: UserStory, storyContent: string) => {
        try {
            await navigator.clipboard.writeText(storyContent);
            setCopiedStoryId(story.id);
            setTimeout(() => setCopiedStoryId(null), 2000);
        } catch (err) {
            logger.error('[ExperienceDialog] Failed to copy story', { error: err });
        }
    };

    const buildStoryContent = (story: UserStory): string => {
        const hasSTARFormat = story.situation && story.task && story.action && story.result;
        const contentParts: string[] = [];

        if (hasSTARFormat) {
            contentParts.push(
                `Situation: ${story.situation}`,
                `Task: ${story.task}`,
                `Action: ${story.action}`,
                `Result: ${story.result}`
            );
        } else if (story.description) {
            contentParts.push(story.description);
        }

        if (story.metrics) {
            contentParts.push(`Metrics: ${story.metrics}`);
        }

        return contentParts.join("\n\n");
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Reference an Experience</DialogTitle>
                    <DialogDescription>
                        Select an experience from your library to help structure your answer
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 mt-4">
                    {stories.map((story) => {
                        const isSelected = selectedStory === story.id;
                        const isExpanded = isSelected;
                        const storyContent = buildStoryContent(story);
                        const hasSTARFormat = story.situation && story.task && story.action && story.result;

                        return (
                            <div key={story.id} className="border rounded-lg overflow-hidden">
                                <Button
                                    variant={isSelected ? "default" : "outline"}
                                    className="w-full justify-start text-left h-auto py-2 rounded-b-none"
                                    onClick={() => onSelectStory(isSelected ? null : story.id)}
                                >
                                    <div className="flex-1">
                                        <div className="font-medium">{story.title}</div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                            {story.description
                                                ? story.description.substring(0, 100) + "..."
                                                : story.situation
                                                    ? story.situation.substring(0, 100) + "..."
                                                    : "No description"}
                                        </div>
                                    </div>
                                </Button>

                                {/* Expanded Content */}
                                {isExpanded && (
                                    <div className="p-4 bg-muted/30 border-t space-y-4">
                                        {/* Copy Button */}
                                        <div className="flex justify-end">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleCopyStory(story, storyContent)}
                                                className="gap-2"
                                            >
                                                {copiedStoryId === story.id ? (
                                                    <>
                                                        <Check className="w-4 h-4" />
                                                        Copied!
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="w-4 h-4" />
                                                        Copy Experience
                                                    </>
                                                )}
                                            </Button>
                                        </div>

                                        {/* Story Content */}
                                        <div className="space-y-3 text-sm">
                                            {hasSTARFormat ? (
                                                <>
                                                    <div>
                                                        <div className="font-medium mb-1">Situation</div>
                                                        <div className="text-muted-foreground whitespace-pre-wrap">
                                                            {story.situation}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="font-medium mb-1">Task</div>
                                                        <div className="text-muted-foreground whitespace-pre-wrap">
                                                            {story.task}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="font-medium mb-1">Action</div>
                                                        <div className="text-muted-foreground whitespace-pre-wrap">
                                                            {story.action}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="font-medium mb-1">Result</div>
                                                        <div className="text-muted-foreground whitespace-pre-wrap">
                                                            {story.result}
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                story.description && (
                                                    <div>
                                                        <div className="font-medium mb-1">Description</div>
                                                        <div className="text-muted-foreground whitespace-pre-wrap">
                                                            {story.description}
                                                        </div>
                                                    </div>
                                                )
                                            )}

                                            {story.metrics && (
                                                <div>
                                                    <div className="font-medium mb-1">Metrics</div>
                                                    <div className="text-muted-foreground">
                                                        {story.metrics}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Metadata */}
                                            <div className="flex flex-wrap gap-2 pt-2 border-t">
                                                {story.tags && story.tags.length > 0 && (
                                                    <div>
                                                        <div className="text-xs font-medium mb-1">Tags</div>
                                                        <div className="flex flex-wrap gap-1">
                                                            {story.tags.map((tag, idx) => (
                                                                <Badge key={idx} variant="secondary" className="text-xs">
                                                                    {tag}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {story.technical_skills && story.technical_skills.length > 0 && (
                                                    <div>
                                                        <div className="text-xs font-medium mb-1">Technical Skills</div>
                                                        <div className="flex flex-wrap gap-1">
                                                            {story.technical_skills.map((skill, idx) => (
                                                                <Badge key={idx} variant="secondary" className="text-xs">
                                                                    {skill}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {story.technologies && story.technologies.length > 0 && (
                                                    <div>
                                                        <div className="text-xs font-medium mb-1">Technologies</div>
                                                        <div className="flex flex-wrap gap-1">
                                                            {story.technologies.map((tech, idx) => (
                                                                <Badge key={idx} variant="secondary" className="text-xs">
                                                                    {tech}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </DialogContent>
        </Dialog>
    );
};
