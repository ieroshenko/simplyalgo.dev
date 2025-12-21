import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Circle, Star, Play, Trophy, Zap } from "lucide-react";
import { Problem } from "@/types";
import { useNavigate } from "react-router-dom";
import CompanyIcons from "@/components/CompanyIcons";

interface ProblemTableProps {
  problems: Problem[];
  filteredCategory?: string;
  filteredCompany?: string;
  filteredDifficulty?: string;
  searchQuery?: string;
  onToggleStar?: (problemId: string) => void;
}

const ProblemTable = ({
  problems,
  filteredCategory,
  filteredCompany,
  filteredDifficulty,
  searchQuery,
  onToggleStar,
}: ProblemTableProps) => {
  const navigate = useNavigate();

  // Category icons removed for a cleaner table UI

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "bg-success text-success-foreground";
      case "Medium":
        // Use yellow/amber for Medium to differentiate from Easy (green)
        return "bg-amber-500 text-white";
      case "Hard":
        return "bg-destructive text-destructive-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "solved":
        return <Trophy className="w-4 h-4 text-emerald-600 fill-emerald-500" />;
      case "attempted":
        return <Zap className="w-4 h-4 text-orange-500" />;
      default:
        return <Circle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const filteredProblems = problems
    .filter((problem) => {
      // Exclude Data Structure Implementations and System Design (they're in separate sections)
      if (problem.category === "Data Structure Implementations" ||
          problem.category === "System Design") {
        return false;
      }

      const matchesCategory =
        !filteredCategory || problem.category === filteredCategory;
      const matchesCompany =
        !filteredCompany ||
        (problem.companies && problem.companies.includes(filteredCompany));
      const matchesDifficulty =
        !filteredDifficulty || problem.difficulty === filteredDifficulty;
      const matchesSearch =
        !searchQuery ||
        problem.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesCompany && matchesDifficulty && matchesSearch;
    })
    .sort((a, b) => {
      // Sort starred problems first
      if (a.isStarred && !b.isStarred) return -1;
      if (!a.isStarred && b.isStarred) return 1;
      return 0;
    });

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-secondary">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                Status
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                Star
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                Problem
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                Category
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                Difficulty
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                Companies
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredProblems.map((problem) => {
              return (
                <tr
                  key={problem.id}
                  className="hover:bg-secondary/50 transition-colors"
                >
                  <td className="px-4 py-3">{getStatusIcon(problem.status)}</td>
                  <td className="px-4 py-3">
                    <button 
                      className="hover:scale-110 transition-transform"
                      onClick={() => onToggleStar?.(problem.id)}
                    >
                      <Star 
                        className={`w-4 h-4 transition-colors ${
                          problem.isStarred 
                            ? "text-amber-500 fill-amber-500" 
                            : "text-muted-foreground hover:text-amber-500"
                        }`} 
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">
                      {problem.title}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-foreground">
                      {problem.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={getDifficultyColor(problem.difficulty)}>
                      {problem.difficulty}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <CompanyIcons 
                      companies={problem.companies || []}
                      maxVisible={4}
                      size={18}
                      className="max-w-32"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      onClick={() => navigate(`/problem/${problem.id}`)}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Start
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default ProblemTable;
