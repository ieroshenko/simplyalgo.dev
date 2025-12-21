import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil, Search } from "lucide-react";
import { AdminProblemDialog, type Problem } from "@/features/admin/components/AdminProblemDialog";

interface Category {
    id: string;
    name: string;
}

const AdminProblemManagement = () => {
    const [problems, setProblems] = useState<Problem[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedProblemId, setSelectedProblemId] = useState<string | null>(null);

    // Filter state
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");

    const { toast } = useToast();

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { data: problemsData, error: problemsError } = await supabase
                .from("problems")
                .select("*")
                .order("created_at", { ascending: false });

            if (problemsError) throw problemsError;

            const { data: categoriesData, error: categoriesError } = await supabase
                .from("categories")
                .select("*")
                .order("name");

            if (categoriesError) throw categoriesError;

            const typedProblems = (problemsData as unknown as Problem[]) || [];
            setProblems(typedProblems);
            setCategories(categoriesData || []);
        } catch (error: unknown) {
            toast({
                variant: "destructive",
                title: "Error fetching data",
                description: error instanceof Error ? error.message : "An error occurred",
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAddProblem = () => {
        setSelectedProblemId(null);
        setIsDialogOpen(true);
    };

    const handleEditProblem = (id: string) => {
        setSelectedProblemId(id);
        setIsDialogOpen(true);
    };

    const filteredProblems = problems.filter(problem => {
        const matchesSearch = problem.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === "all" || problem.category_id === selectedCategory;
        const matchesDifficulty = selectedDifficulty === "all" || problem.difficulty === selectedDifficulty;
        return matchesSearch && matchesCategory && matchesDifficulty;
    });

    const selectedProblem = problems.find(p => p.id === selectedProblemId) || null;

    return (
        <div className="container mx-auto py-10 px-4">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Problem Administration</h1>
                <Button onClick={handleAddProblem}>
                    <Plus className="mr-2 h-4 w-4" /> Add Problem
                </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search problems..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                                {category.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Difficulties</SelectItem>
                        <SelectItem value="Easy">Easy</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Hard">Hard</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {loading ? (
                <div className="flex justify-center p-10">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            ) : (
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Difficulty</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Created At</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredProblems.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-10">
                                        No problems found matching your criteria.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredProblems.map((problem) => (
                                    <TableRow key={problem.id}>
                                        <TableCell className="font-medium">{problem.title}</TableCell>
                                        <TableCell>
                                            <span
                                                className={`px-2 py-1 rounded-full text-xs ${problem.difficulty === "Easy"
                                                    ? "bg-green-100 text-green-800"
                                                    : problem.difficulty === "Medium"
                                                        ? "bg-yellow-100 text-yellow-800"
                                                        : "bg-red-100 text-red-800"
                                                    }`}
                                            >
                                                {problem.difficulty}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {categories.find((c) => c.id === problem.category_id)?.name ||
                                                "Unknown"}
                                        </TableCell>
                                        <TableCell>
                                            {problem.created_at ? new Date(problem.created_at).toLocaleDateString() : 'N/A'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" onClick={() => handleEditProblem(problem.id)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            <AdminProblemDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                problem={selectedProblem}
                onSaved={(savedProblem) => {
                    if (savedProblem) {
                        setProblems(prev => {
                            const exists = prev.find(p => p.id === savedProblem.id);
                            if (exists) {
                                return prev.map(p => p.id === savedProblem.id ? savedProblem : p);
                            }
                            return [savedProblem, ...prev];
                        });
                    } else {
                        fetchData();
                    }
                    setIsDialogOpen(false);
                }}
                categories={categories}
            />
        </div>
    );
};

export default AdminProblemManagement;
