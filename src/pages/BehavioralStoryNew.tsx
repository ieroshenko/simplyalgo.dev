import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useUserStories } from "@/hooks/useUserStories";
import { ArrowLeft, X, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const BehavioralStoryNew = () => {
  const navigate = useNavigate();
  const { createStory } = useUserStories();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [metrics, setMetrics] = useState("");
  // Optional STAR fields for users who want structure
  const [situation, setSituation] = useState("");
  const [task, setTask] = useState("");
  const [action, setAction] = useState("");
  const [result, setResult] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [technicalSkills, setTechnicalSkills] = useState<string[]>([]);
  const [technologies, setTechnologies] = useState<string[]>([]);
  
  // Input states for adding new tags/skills/technologies
  const [tagInput, setTagInput] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [techInput, setTechInput] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const addTag = (tag: string) => {
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const addTechnicalSkill = (skill: string) => {
    if (skill && !technicalSkills.includes(skill)) {
      setTechnicalSkills([...technicalSkills, skill]);
    }
  };

  const removeTechnicalSkill = (skillToRemove: string) => {
    setTechnicalSkills(technicalSkills.filter((skill) => skill !== skillToRemove));
  };

  const addTechnology = (tech: string) => {
    if (tech && !technologies.includes(tech)) {
      setTechnologies([...technologies, tech]);
    }
  };

  const removeTechnology = (techToRemove: string) => {
    setTechnologies(technologies.filter((tech) => tech !== techToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation - only title and description are required
    if (!title.trim() || !description.trim()) {
      toast({
        title: "Missing required fields",
        description: "Please provide a title and description of your experience",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await createStory({
        title: title.trim(),
        description: description.trim(),
        situation: situation.trim() || undefined,
        task: task.trim() || undefined,
        action: action.trim() || undefined,
        result: result.trim() || undefined,
        metrics: metrics.trim() || undefined,
        tags,
        technical_skills: technicalSkills,
        technologies,
        related_problem_ids: [],
      });

      toast({
        title: "Experience saved!",
        description: "Your experience has been added to your library",
      });

      navigate("/behavioral/stories");
    } catch (error) {
      toast({
        title: "Error creating story",
        description: error instanceof Error ? error.message : "Failed to create story",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-6 max-w-[68rem] mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/behavioral/stories")}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Add Experience</h1>
                <p className="text-muted-foreground mt-2">
                  Document your projects, achievements, and experiences for interview prep
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <Card>
              <CardHeader>
                <CardTitle>Title</CardTitle>
                <CardDescription>
                  Give your experience a memorable name for easy reference
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Input
                  placeholder="e.g., Optimized Database Queries, Built Payment System, Led Team Migration"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </CardContent>
            </Card>

            {/* Main Description */}
            <Card>
              <CardHeader>
                <CardTitle>What did you do? <span className="text-destructive">*</span></CardTitle>
                <CardDescription>
                  Describe your experience, project, or achievement. Include what you did, challenges you faced, and outcomes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Example: I optimized our production database that was experiencing 5-second query times. I analyzed slow query logs, identified missing indexes, and implemented them during off-peak hours. This reduced query times from 5 seconds to 50ms, cutting user complaints by 90% and improving page load times by 40%."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[200px]"
                  required
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Tip: Include context, your specific actions, and any measurable results. You can reference this when answering behavioral questions.
                </p>
              </CardContent>
            </Card>

            {/* Optional STAR Structure (Collapsible) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Optional: STAR Structure</CardTitle>
                <CardDescription className="text-xs">
                  If you want to structure this using STAR method, fill these optional fields
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="situation" className="text-sm">Situation (Optional)</Label>
                  <Textarea
                    id="situation"
                    placeholder="Context and background"
                    value={situation}
                    onChange={(e) => setSituation(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="task" className="text-sm">Task (Optional)</Label>
                  <Textarea
                    id="task"
                    placeholder="What needed to be accomplished"
                    value={task}
                    onChange={(e) => setTask(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="action" className="text-sm">Action (Optional)</Label>
                  <Textarea
                    id="action"
                    placeholder="What you specifically did"
                    value={action}
                    onChange={(e) => setAction(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="result" className="text-sm">Result (Optional)</Label>
                  <Textarea
                    id="result"
                    placeholder="Outcome and what you learned"
                    value={result}
                    onChange={(e) => setResult(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Metrics (Optional)</CardTitle>
                <CardDescription>
                  Quantifiable results make your story more impactful
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Input
                  placeholder="e.g., Reduced latency by 40%, Fixed 15 production bugs"
                  value={metrics}
                  onChange={(e) => setMetrics(e.target.value)}
                />
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader>
                <CardTitle>Categories (Optional)</CardTitle>
                <CardDescription>
                  Tag your story to help match it with relevant questions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
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
                    .filter((cat) => !tags.includes(cat))
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
              </CardContent>
            </Card>

            {/* Technical Skills */}
            <Card>
              <CardHeader>
                <CardTitle>Technical Skills (Optional)</CardTitle>
                <CardDescription>
                  What technical skills did you demonstrate?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {technicalSkills.map((skill) => (
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
                    .filter((skill) => !technicalSkills.includes(skill))
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
              </CardContent>
            </Card>

            {/* Technologies */}
            <Card>
              <CardHeader>
                <CardTitle>Technologies (Optional)</CardTitle>
                <CardDescription>
                  What technologies or tools were involved?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {technologies.map((tech) => (
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
                    .filter((tech) => !technologies.includes(tech))
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
              </CardContent>
            </Card>

            {/* Submit Buttons */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/behavioral/stories")}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Experience"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BehavioralStoryNew;

