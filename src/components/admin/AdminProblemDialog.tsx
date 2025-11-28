import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, Save } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";

interface Problem {
  id: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  category_id: string;
  description: string;
  function_signature: string;
  companies: string[];
  examples: any[];
  constraints: string[];
  hints: string[];
  recommended_time_complexity: string;
  recommended_space_complexity: string;
}

interface TestCase {
  id: string; // ID is mandatory for existing ones
  problem_id: string;
  input: string;
  expected_output: string;
  explanation?: string;
  is_example: boolean;
}

interface Solution {
  id: string; // ID is mandatory
  problem_id: string;
  title: string;
  code: string;
  language: string;
  time_complexity?: string;
  space_complexity?: string;
  approach_type?: string;
  difficulty_rating?: number;
  is_preferred: boolean;
  explanation?: string;
}

interface Category {
  id: string;
  name: string;
}

interface AdminProblemDialogProps {
  problemId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  categories: Category[];
}

export function AdminProblemDialog({
  problemId,
  open,
  onOpenChange,
  onSaved,
  categories,
}: AdminProblemDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  const [formData, setFormData] = useState<Problem>({
    id: "",
    title: "",
    difficulty: "Easy",
    category_id: "",
    description: "",
    function_signature: "",
    companies: [],
    examples: [],
    constraints: [],
    hints: [],
    recommended_time_complexity: "",
    recommended_space_complexity: "",
  });

  const [jsonState, setJsonState] = useState({
    companies: "[]",
    examples: "[]",
    constraints: "[]",
    hints: "[]",
  });

  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [solutions, setSolutions] = useState<Solution[]>([]);

  useEffect(() => {
    if (open) {
      if (problemId) {
        loadProblem();
      } else {
        setFormData({
          id: "",
          title: "",
          difficulty: "Easy",
          category_id: categories[0]?.id || "",
          description: "",
          function_signature: "",
          companies: [],
          examples: [],
          constraints: [],
          hints: [],
          recommended_time_complexity: "",
          recommended_space_complexity: "",
        });
        setJsonState({
          companies: "[]",
          examples: "[]",
          constraints: "[]",
          hints: "[]",
        });
        setTestCases([]);
        setSolutions([]);
        setActiveTab("details");
      }
    }
  }, [open, problemId]);

  const loadProblem = async () => {
    if (!problemId) return;
    setLoading(true);
    try {
      const { data: problem, error: problemError } = await supabase
        .from("problems")
        .select("*")
        .eq("id", problemId)
        .single();

      if (problemError) throw problemError;

      const { data: tcs, error: tcError } = await supabase
        .from("test_cases")
        .select("*")
        .eq("problem_id", problemId)
        .order("created_at");

      if (tcError) throw tcError;

      const { data: sols, error: solError } = await supabase
        .from("problem_solutions")
        .select("*")
        .eq("problem_id", problemId);

      if (solError) throw solError;

      setFormData(problem as any);
      setJsonState({
        companies: JSON.stringify(problem.companies || [], null, 2),
        examples: JSON.stringify(problem.examples || [], null, 2),
        constraints: JSON.stringify(problem.constraints || [], null, 2),
        hints: JSON.stringify(problem.hints || [], null, 2),
      });
      setTestCases(tcs as any || []);
      setSolutions(sols as any || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading problem",
        description: error.message,
      });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProblem = async () => {
    try {
      setLoading(true);
      const companies = JSON.parse(jsonState.companies || "[]");
      const examples = JSON.parse(jsonState.examples || "[]");
      const constraints = JSON.parse(jsonState.constraints || "[]");
      const hints = JSON.parse(jsonState.hints || "[]");

      const problemData = {
        ...formData,
        companies,
        examples,
        constraints,
        hints,
      };

      if (problemId) {
        const { error } = await supabase
          .from("problems")
          .update(problemData)
          .eq("id", problemId);
        if (error) throw error;
        toast({ title: "Problem updated" });
      } else {
        const { error } = await supabase.from("problems").insert([problemData]);
        if (error) throw error;
        toast({ title: "Problem created" });
      }
      onSaved();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error saving problem",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTestCase = async (index: number, field: keyof TestCase, value: string) => {
    const newTestCases = [...testCases];
    newTestCases[index] = { ...newTestCases[index], [field]: value };
    setTestCases(newTestCases);
  };

  const handleSaveTestCase = async (tc: TestCase) => {
    try {
      const { error } = await supabase
        .from("test_cases")
        .update({ input: tc.input, expected_output: tc.expected_output })
        .eq("id", tc.id);
      if (error) throw error;
      toast({ title: "Test case updated" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error updating test case", description: error.message });
    }
  };

  const handleUpdateSolution = async (index: number, field: keyof Solution, value: string) => {
    const newSolutions = [...solutions];
    newSolutions[index] = { ...newSolutions[index], [field]: value };
    setSolutions(newSolutions);
  };

  const handleSaveSolution = async (sol: Solution) => {
    try {
      const { error } = await supabase
        .from("problem_solutions")
        .update({ code: sol.code, title: sol.title })
        .eq("id", sol.id);
      if (error) throw error;
      toast({ title: "Solution updated" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error updating solution", description: error.message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>{problemId ? "Edit Problem" : "New Problem"}</DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="testcases" disabled={!problemId}>
              Test Cases
            </TabsTrigger>
            <TabsTrigger value="solutions" disabled={!problemId}>
              Solutions
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 p-4">
            <TabsContent value="details" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ID (Slug)</Label>
                  <Input
                    value={formData.id}
                    onChange={(e) =>
                      setFormData({ ...formData, id: e.target.value })
                    }
                    disabled={!!problemId}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Difficulty</Label>
                  <Select
                    value={formData.difficulty}
                    onValueChange={(v: any) =>
                      setFormData({ ...formData, difficulty: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Easy">Easy</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={formData.category_id}
                    onValueChange={(v) =>
                      setFormData({ ...formData, category_id: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description (Markdown)</Label>
                <Textarea
                  className="min-h-[200px]"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Function Signature</Label>
                <Textarea
                  className="font-mono"
                  value={formData.function_signature}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      function_signature: e.target.value,
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Companies (JSON)</Label>
                  <Textarea
                    className="font-mono text-xs"
                    value={jsonState.companies}
                    onChange={(e) =>
                      setJsonState({ ...jsonState, companies: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Constraints (JSON)</Label>
                  <Textarea
                    className="font-mono text-xs"
                    value={jsonState.constraints}
                    onChange={(e) =>
                      setJsonState({ ...jsonState, constraints: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hints (JSON)</Label>
                  <Textarea
                    className="font-mono text-xs"
                    value={jsonState.hints}
                    onChange={(e) =>
                      setJsonState({ ...jsonState, hints: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Examples (JSON)</Label>
                  <Textarea
                    className="font-mono text-xs"
                    value={jsonState.examples}
                    onChange={(e) =>
                      setJsonState({ ...jsonState, examples: e.target.value })
                    }
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="testcases" className="space-y-4 mt-0">
              {testCases.map((tc, idx) => (
                <Card key={tc.id || idx}>
                  <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm">Test Case {idx + 1}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Input</Label>
                        <Textarea
                          className="font-mono text-xs h-20"
                          value={tc.input}
                          onChange={(e) => handleUpdateTestCase(idx, 'input', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Expected</Label>
                        <Textarea
                          className="font-mono text-xs h-20"
                          value={tc.expected_output}
                          onChange={(e) => handleUpdateTestCase(idx, 'expected_output', e.target.value)}
                        />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="p-2 flex justify-end bg-muted/20">
                      <Button size="sm" onClick={() => handleSaveTestCase(tc)}>
                          <Save className="w-4 h-4 mr-2"/> Save Test Case
                      </Button>
                  </CardFooter>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="solutions" className="space-y-4 mt-0">
              {solutions.map((sol, idx) => (
                <Card key={sol.id || idx}>
                  <CardHeader className="p-4 pb-2">
                    <div className="space-y-1">
                        <Label className="text-xs">Title</Label>
                        <Input 
                            value={sol.title} 
                            onChange={(e) => handleUpdateSolution(idx, 'title', e.target.value)}
                            className="h-8"
                        />
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <Label className="text-xs">Code ({sol.language})</Label>
                    <Textarea
                      className="font-mono text-xs h-32"
                      value={sol.code}
                      onChange={(e) => handleUpdateSolution(idx, 'code', e.target.value)}
                    />
                  </CardContent>
                  <CardFooter className="p-2 flex justify-end bg-muted/20">
                      <Button size="sm" onClick={() => handleSaveSolution(sol)}>
                          <Save className="w-4 h-4 mr-2"/> Save Solution
                      </Button>
                  </CardFooter>
                </Card>
              ))}
            </TabsContent>
          </ScrollArea>

          <div className="flex justify-end gap-2 pt-4 border-t mt-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {/* Save button only on details tab or global if I wanted to save all, but separate saves are better for lists */}
             {activeTab === 'details' && (
                <Button onClick={handleSaveProblem} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Problem Details
                </Button>
             )}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}