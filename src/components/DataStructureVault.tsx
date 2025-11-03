import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import dataStructures from "@/data/dataStructures.json";

type Difficulty = "Easy" | "Medium" | "Hard";

interface DataStructure {
  slug: string;
  name: string;
  difficulty: Difficulty;
  complexity: string;
  description: string;
  operations: Record<string, string>;
  code: {
    python: string;
    javascript: string;
  };
  useCases: string[];
  relatedProblems: string[];
}

const DataStructureVault = () => {
  const [selectedDifficulty, setSelectedDifficulty] = useState<
    Difficulty | "All"
  >("All");
  const navigate = useNavigate();

  const difficulties: (Difficulty | "All")[] = [
    "All",
    "Easy",
    "Medium",
    "Hard",
  ];

  const filteredStructures =
    selectedDifficulty === "All"
      ? dataStructures
      : dataStructures.filter((ds) => ds.difficulty === selectedDifficulty);

  const getDifficultyColor = (difficulty: Difficulty) => {
    switch (difficulty) {
      case "Easy":
        return "bg-primary text-primary-foreground";
      case "Medium":
        return "bg-amber-500 text-white";
      case "Hard":
        return "bg-destructive text-destructive-foreground";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const handleCardClick = (slug: string) => {
    // Directly navigate to the implementation problem for the selected data structure
    navigate(`/problems/implement-${slug}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Data-Structure Vault 📚
        </h1>
        <p className="text-muted-foreground">
          Master the 20 most common interview data structures with visual
          explanations and code examples
        </p>
      </div>

      {/* Difficulty Filters */}
      <div className="flex flex-wrap gap-2">
        {difficulties.map((difficulty) => (
          <Button
            key={difficulty}
            variant={selectedDifficulty === difficulty ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedDifficulty(difficulty)}
            className={
              selectedDifficulty === difficulty
                ? "bg-primary text-primary-foreground"
                : "hover:bg-secondary"
            }
          >
            {difficulty}
          </Button>
        ))}
      </div>

      {/* Data Structures Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredStructures.map((structure) => (
          <Card
            key={structure.slug}
            className="p-6 cursor-pointer hover:shadow-lg transition-shadow duration-200"
            onClick={() => handleCardClick(structure.slug)}
          >
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">
                  {structure.name}
                </h3>
                <Badge
                  className={getDifficultyColor(
                    structure.difficulty as Difficulty,
                  )}
                >
                  {structure.difficulty}
                </Badge>
              </div>

              {/* Complexity Badge */}
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {structure.complexity}
                </Badge>
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground line-clamp-3">
                {structure.description}
              </p>

              {/* Key Operations */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-foreground">
                  Key Operations:
                </p>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(structure.operations)
                    .slice(0, 3)
                    .map(([op, complexity]) => (
                      <span
                        key={op}
                        className="text-xs bg-muted px-2 py-1 rounded"
                      >
                        {op}: {complexity}
                      </span>
                    ))}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredStructures.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            No data structures found for the selected difficulty.
          </p>
        </div>
      )}
    </div>
  );
};

export default DataStructureVault;
