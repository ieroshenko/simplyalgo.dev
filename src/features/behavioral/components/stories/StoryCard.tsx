import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { UserStory } from "@/types";

interface StoryCardProps {
    story: UserStory;
    onEdit: (story: UserStory) => void;
}

export const StoryCard = ({ story, onEdit }: StoryCardProps) => {
    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
                <CardTitle>{story.title}</CardTitle>
                <CardDescription>
                    Used {story.practice_count} time{story.practice_count !== 1 ? "s" : ""}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {story.description && (
                    <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">Description</div>
                        <div className="text-sm whitespace-pre-wrap">{story.description}</div>
                    </div>
                )}
                {story.metrics && (
                    <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">Results</div>
                        <div className="text-sm">{story.metrics}</div>
                    </div>
                )}
                {(story.technical_skills && story.technical_skills.length > 0) ||
                    (story.technologies && story.technologies.length > 0) ||
                    (story.tags && story.tags.length > 0) ? (
                    <div className="flex flex-wrap gap-2 pt-2">
                        {story.technical_skills?.map((skill) => (
                            <Badge key={skill} variant="secondary" className="text-xs">
                                {skill.replace(/_/g, " ")}
                            </Badge>
                        ))}
                        {story.technologies?.map((tech) => (
                            <Badge key={tech} variant="outline" className="text-xs">
                                {tech}
                            </Badge>
                        ))}
                        {story.tags?.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                                {tag.replace(/_/g, " ")}
                            </Badge>
                        ))}
                    </div>
                ) : null}
                <div className="flex gap-2 pt-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(story)}
                    >
                        Edit
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};
