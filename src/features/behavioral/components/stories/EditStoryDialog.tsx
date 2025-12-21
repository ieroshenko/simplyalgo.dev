import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X, Loader2, Mic, MicOff } from "lucide-react";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import { logger } from "@/utils/logger";
import type { UserStory } from "@/types";

interface EditStoryDialogProps {
    isOpen: boolean;
    onClose: () => void;
    story: UserStory | null;
    onSubmit: (updates: Partial<UserStory>) => Promise<void>;
    isSubmitting: boolean;
}

const availableCategories = [
    "technical_leadership",
    "code_review_collaboration",
    "debugging_problem_solving",
    "system_design_architecture",
    "technical_failure_recovery",
    "technical_debt_prioritization",
    "technical_communication",
    "technical_initiative",
    "learning_new_technologies",
    "code_quality_best_practices",
    "scaling_performance",
];

const commonTechnicalSkills = [
    "system_design",
    "performance_optimization",
    "code_review",
    "debugging",
    "architecture",
    "scaling",
    "testing",
    "refactoring",
];

const commonTechnologies = [
    "React",
    "Node.js",
    "Python",
    "PostgreSQL",
    "AWS",
    "Docker",
    "Kubernetes",
    "TypeScript",
    "JavaScript",
    "Java",
    "Go",
    "Redis",
    "MongoDB",
];

export const EditStoryDialog = ({
    isOpen,
    onClose,
    story,
    onSubmit,
    isSubmitting,
}: EditStoryDialogProps) => {
    const [editTitle, setEditTitle] = useState(story?.title || "");
    const [editDescription, setEditDescription] = useState(story?.description || "");
    const [editSituation, setEditSituation] = useState(story?.situation || "");
    const [editTask, setEditTask] = useState(story?.task || "");
    const [editAction, setEditAction] = useState(story?.action || "");
    const [editResult, setEditResult] = useState(story?.result || "");
    const [editMetrics, setEditMetrics] = useState(story?.metrics || "");
    const [editTags, setEditTags] = useState<string[]>(story?.tags || []);
    const [editTechnicalSkills, setEditTechnicalSkills] = useState<string[]>(story?.technical_skills || []);
    const [editTechnologies, setEditTechnologies] = useState<string[]>(story?.technologies || []);

    // Keep state in sync with story prop
    useState(() => {
        if (story) {
            setEditTitle(story.title);
            setEditDescription(story.description || "");
            setEditSituation(story.situation || "");
            setEditTask(story.task || "");
            setEditAction(story.action || "");
            setEditResult(story.result || "");
            setEditMetrics(story.metrics || "");
            setEditTags(story.tags || []);
            setEditTechnicalSkills(story.technical_skills || []);
            setEditTechnologies(story.technologies || []);
        }
    });

    // Speech-to-text for title
    const {
        isListening: isListeningTitle,
        hasNativeSupport: hasNativeSupportTitle,
        isProcessing: isProcessingTitle,
        startListening: startListeningTitle,
        stopListening: stopListeningTitle,
        error: speechErrorTitle,
    } = useSpeechToText({
        onResult: (transcript) => {
            setEditTitle((prev) => prev + (prev ? ' ' : '') + transcript);
        },
        onError: (error) => {
            logger.error('[EditStoryDialog] Speech recognition error (title)', { error });
        },
    });

    // Speech-to-text for description
    const {
        isListening: isListeningDescription,
        hasNativeSupport: hasNativeSupportDescription,
        isProcessing: isProcessingDescription,
        startListening: startListeningDescription,
        stopListening: stopListeningDescription,
        error: speechErrorDescription,
    } = useSpeechToText({
        onResult: (transcript) => {
            setEditDescription((prev) => prev + (prev ? ' ' : '') + transcript);
        },
        onError: (error) => {
            logger.error('[EditStoryDialog] Speech recognition error (description)', { error });
        },
    });

    const toggleMicrophoneTitle = async () => {
        if (!hasNativeSupportTitle) return;
        if (isListeningTitle) {
            stopListeningTitle();
        } else {
            await startListeningTitle();
        }
    };

    const toggleMicrophoneDescription = async () => {
        if (!hasNativeSupportDescription) return;
        if (isListeningDescription) {
            stopListeningDescription();
        } else {
            await startListeningDescription();
        }
    };

    const addTag = (tag: string) => {
        if (tag && !editTags.includes(tag)) {
            setEditTags([...editTags, tag]);
        }
    };

    const removeTag = (tagToRemove: string) => {
        setEditTags(editTags.filter((tag) => tag !== tagToRemove));
    };

    const addTechnicalSkill = (skill: string) => {
        if (skill && !editTechnicalSkills.includes(skill)) {
            setEditTechnicalSkills([...editTechnicalSkills, skill]);
        }
    };

    const removeTechnicalSkill = (skillToRemove: string) => {
        setEditTechnicalSkills(editTechnicalSkills.filter((skill) => skill !== skillToRemove));
    };

    const addTechnology = (tech: string) => {
        if (tech && !editTechnologies.includes(tech)) {
            setEditTechnologies([...editTechnologies, tech]);
        }
    };

    const removeTechnology = (techToRemove: string) => {
        setEditTechnologies(editTechnologies.filter((tech) => tech !== techToRemove));
    };

    const handleSubmit = async () => {
        await onSubmit({
            title: editTitle.trim(),
            description: editDescription.trim(),
            situation: editSituation.trim() || undefined,
            task: editTask.trim() || undefined,
            action: editAction.trim() || undefined,
            result: editResult.trim() || undefined,
            metrics: editMetrics.trim() || undefined,
            tags: editTags,
            technical_skills: editTechnicalSkills,
            technologies: editTechnologies,
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Experience</DialogTitle>
                    <DialogDescription>
                        Update your experience details
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Title */}
                    <div className="space-y-2">
                        <Label htmlFor="edit-title">Title *</Label>
                        <div className="relative">
                            <Input
                                id="edit-title"
                                placeholder={
                                    isListeningTitle
                                        ? "🎤 Listening... Speak the title."
                                        : isProcessingTitle
                                            ? "🔄 Processing audio..."
                                            : "e.g., Optimized Database Queries, Built Payment System"
                                }
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className={hasNativeSupportTitle ? "pr-10" : ""}
                                required
                            />
                            {hasNativeSupportTitle && (
                                <button
                                    type="button"
                                    onClick={toggleMicrophoneTitle}
                                    disabled={isSubmitting}
                                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors ${isListeningTitle
                                        ? "text-red-500 animate-pulse"
                                        : isProcessingTitle
                                            ? "text-blue-500"
                                            : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                        }`}
                                    title={
                                        isListeningTitle
                                            ? "Stop listening"
                                            : isProcessingTitle
                                                ? "Processing..."
                                                : "Start voice input"
                                    }
                                >
                                    {isListeningTitle ? (
                                        <MicOff className="w-4 h-4" />
                                    ) : isProcessingTitle ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Mic className="w-4 h-4" />
                                    )}
                                </button>
                            )}
                            {speechErrorTitle && (
                                <div
                                    className="absolute right-10 top-1/2 -translate-y-1/2 text-xs text-red-500 opacity-80"
                                    title={speechErrorTitle}
                                >
                                    ⚠️
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Main Description */}
                    <div className="space-y-2">
                        <Label htmlFor="edit-description">What did you do? *</Label>
                        <div className="relative">
                            <Textarea
                                id="edit-description"
                                placeholder={
                                    isListeningDescription
                                        ? "🎤 Listening... Speak your description."
                                        : isProcessingDescription
                                            ? "🔄 Processing audio..."
                                            : "Describe your experience, project, or achievement..."
                                }
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                className={`min-h-[200px] ${hasNativeSupportDescription ? "pr-10" : ""}`}
                                required
                            />
                            {hasNativeSupportDescription && (
                                <button
                                    type="button"
                                    onClick={toggleMicrophoneDescription}
                                    disabled={isSubmitting}
                                    className={`absolute right-2 top-2 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors ${isListeningDescription
                                        ? "text-red-500 animate-pulse"
                                        : isProcessingDescription
                                            ? "text-blue-500"
                                            : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                        }`}
                                    title={
                                        isListeningDescription
                                            ? "Stop listening"
                                            : isProcessingDescription
                                                ? "Processing..."
                                                : "Start voice input"
                                    }
                                >
                                    {isListeningDescription ? (
                                        <MicOff className="w-4 h-4" />
                                    ) : isProcessingDescription ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Mic className="w-4 h-4" />
                                    )}
                                </button>
                            )}
                            {speechErrorDescription && (
                                <div
                                    className="absolute right-10 top-2 text-xs text-red-500 opacity-80"
                                    title={speechErrorDescription}
                                >
                                    ⚠️
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Optional STAR Structure */}
                    <div className="space-y-4">
                        <div className="text-sm font-medium">Optional: STAR Structure</div>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-situation" className="text-sm">Situation (Optional)</Label>
                                <Textarea
                                    id="edit-situation"
                                    placeholder="Context and background"
                                    value={editSituation}
                                    onChange={(e) => setEditSituation(e.target.value)}
                                    className="min-h-[80px]"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-task" className="text-sm">Task (Optional)</Label>
                                <Textarea
                                    id="edit-task"
                                    placeholder="What needed to be accomplished"
                                    value={editTask}
                                    onChange={(e) => setEditTask(e.target.value)}
                                    className="min-h-[80px]"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-action" className="text-sm">Action (Optional)</Label>
                                <Textarea
                                    id="edit-action"
                                    placeholder="What you specifically did"
                                    value={editAction}
                                    onChange={(e) => setEditAction(e.target.value)}
                                    className="min-h-[80px]"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-result" className="text-sm">Result (Optional)</Label>
                                <Textarea
                                    id="edit-result"
                                    placeholder="Outcome and what you learned"
                                    value={editResult}
                                    onChange={(e) => setEditResult(e.target.value)}
                                    className="min-h-[80px]"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Metrics */}
                    <div className="space-y-2">
                        <Label htmlFor="edit-metrics">Metrics (Optional)</Label>
                        <Input
                            id="edit-metrics"
                            placeholder="e.g., Reduced latency by 40%, Fixed 15 production bugs"
                            value={editMetrics}
                            onChange={(e) => setEditMetrics(e.target.value)}
                        />
                    </div>

                    {/* Tags */}
                    <div className="space-y-2">
                        <Label>Categories (Optional)</Label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {editTags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="gap-1">
                                    {tag.replace(/_/g, " ")}
                                    <button
                                        type="button"
                                        onClick={() => removeTag(tag)}
                                        className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {availableCategories
                                .filter((cat) => !editTags.includes(cat))
                                .slice(0, 6)
                                .map((cat) => (
                                    <Button
                                        key={cat}
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => addTag(cat)}
                                    >
                                        + {cat.replace(/_/g, " ")}
                                    </Button>
                                ))}
                        </div>
                    </div>

                    {/* Technical Skills */}
                    <div className="space-y-2">
                        <Label>Technical Skills (Optional)</Label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {editTechnicalSkills.map((skill) => (
                                <Badge key={skill} variant="secondary" className="gap-1">
                                    {skill.replace(/_/g, " ")}
                                    <button
                                        type="button"
                                        onClick={() => removeTechnicalSkill(skill)}
                                        className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {commonTechnicalSkills
                                .filter((skill) => !editTechnicalSkills.includes(skill))
                                .map((skill) => (
                                    <Button
                                        key={skill}
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => addTechnicalSkill(skill)}
                                    >
                                        + {skill.replace(/_/g, " ")}
                                    </Button>
                                ))}
                        </div>
                    </div>

                    {/* Technologies */}
                    <div className="space-y-2">
                        <Label>Technologies (Optional)</Label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {editTechnologies.map((tech) => (
                                <Badge key={tech} variant="secondary" className="gap-1">
                                    {tech}
                                    <button
                                        type="button"
                                        onClick={() => removeTechnology(tech)}
                                        className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {commonTechnologies
                                .filter((tech) => !editTechnologies.includes(tech))
                                .map((tech) => (
                                    <Button
                                        key={tech}
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => addTechnology(tech)}
                                    >
                                        + {tech}
                                    </Button>
                                ))}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Updating...
                            </>
                        ) : (
                            "Update Experience"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
