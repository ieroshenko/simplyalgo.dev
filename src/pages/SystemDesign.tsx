import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Sidebar from "@/components/Sidebar";
import SystemDesignTable from "@/components/SystemDesignTable";
import CompanyIcon from "@/components/CompanyIcon";
import { useState, useEffect, useMemo } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getUserAvatarUrl, getUserInitials, getUserName } from "@/lib/userAvatar";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  Target,
  Search,
  User,
  Trophy,
  Zap,
  TrendingUp,
  Code2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSystemDesignSpecs } from "@/hooks/useSystemDesignSpecs";
import { useUserStats } from "@/hooks/useUserStats";

const SystemDesign = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const {
    specs,
    categories: dbCategories,
    loading: specsLoading,
    toggleStar,
    refetch: refetchSpecs,
  } = useSystemDesignSpecs(user?.id);
  const { stats, profile, loading: statsLoading } = useUserStats(user?.id);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(
    () => {
      const saved = localStorage.getItem("system-design-selected-category");
      return saved || undefined;
    },
  );
  const [selectedCompany, setSelectedCompany] = useState<string | undefined>(
    () => {
      const saved = localStorage.getItem("system-design-selected-company");
      return saved || undefined;
    },
  );
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | undefined>(
    () => {
      const saved = localStorage.getItem("system-design-selected-difficulty");
      return saved || undefined;
    },
  );
  const [searchQuery, setSearchQuery] = useState("");

  const categories = useMemo(() => ["All", ...dbCategories.map((c) => c.name)], [dbCategories]);
  
  // Extract unique companies from specs with memoization
  const companies = useMemo(() => {
    const allCompanies = Array.from(
      new Set(
        specs.flatMap(spec => spec.companies || [])
      )
    ).sort();
    return ["All", ...allCompanies];
  }, [specs]);
  
  // Define difficulty options
  const difficulties = useMemo(() => ["All", "Easy", "Medium", "Hard"], []);

  // Generic filter handler
  const createFilterHandler = (
    setter: (value: string | undefined) => void,
    storageKey: string
  ) => (value: string) => {
    const filterValue = value === "All" ? undefined : value;
    setter(filterValue);
    if (filterValue) {
      localStorage.setItem(storageKey, filterValue);
    } else {
      localStorage.removeItem(storageKey);
    }
  };

  const handleCategorySelect = createFilterHandler(
    setSelectedCategory,
    "system-design-selected-category"
  );
  const handleCompanySelect = createFilterHandler(
    setSelectedCompany,
    "system-design-selected-company"
  );
  const handleDifficultySelect = createFilterHandler(
    setSelectedDifficulty,
    "system-design-selected-difficulty"
  );

  // Validate saved category exists in available categories
  useEffect(() => {
    if (
      !specsLoading &&
      categories.length > 1 &&
      selectedCategory &&
      !categories.includes(selectedCategory)
    ) {
      setSelectedCategory(undefined);
      localStorage.removeItem("system-design-selected-category");
    }
  }, [dbCategories, selectedCategory, specsLoading, categories]);

  // Validate saved company exists in available companies
  useEffect(() => {
    if (
      !specsLoading &&
      companies.length > 1 &&
      selectedCompany &&
      !companies.includes(selectedCompany)
    ) {
      setSelectedCompany(undefined);
      localStorage.removeItem("system-design-selected-company");
    }
  }, [companies, selectedCompany, specsLoading]);

  // Validate saved difficulty exists in available difficulties
  useEffect(() => {
    if (
      selectedDifficulty &&
      !difficulties.includes(selectedDifficulty)
    ) {
      setSelectedDifficulty(undefined);
      localStorage.removeItem("system-design-selected-difficulty");
    }
  }, [selectedDifficulty, difficulties]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/");
    }
  }, [user, authLoading, navigate]);

  if (authLoading || specsLoading || statsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const displayName = getUserName(user, profile);
  const initials = getUserInitials(displayName);
  const avatarUrl = getUserAvatarUrl(user, profile, 80);

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />

      <div className="flex-1 p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              System Design Problems
            </h1>
            <p className="text-muted-foreground mt-1">
              Practice system design interviews and architecture challenges
            </p>
          </div>

          <Button
            variant="ghost"
            onClick={() => navigate("/profile")}
            className="flex items-center space-x-3 px-4 py-2 hover:bg-secondary rounded-lg"
          >
            <Avatar className="w-8 h-8">
              <AvatarImage src={avatarUrl} referrerPolicy="no-referrer" loading="lazy" />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="text-left">
              <div className="text-sm font-medium text-foreground">
                {displayName}
              </div>
              <div className="text-xs text-muted-foreground">View Profile</div>
            </div>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {stats.totalSolved}
                </div>
                <div className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                  Problems Solved
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {stats.streak}
                </div>
                <div className="text-sm text-orange-700 dark:text-orange-300 font-medium">
                  Day Streak
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Filters */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              Filters
            </h2>
            <div className="flex flex-wrap gap-4">
              {/* Category Filter */}
              <div className="flex flex-col space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Category</label>
                <Select
                  value={selectedCategory || "All"}
                  onValueChange={(value) => handleCategorySelect(value)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue>
                      {selectedCategory || "All Categories"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Company Filter */}
              <div className="flex flex-col space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Company</label>
                <Select
                  value={selectedCompany || "All"}
                  onValueChange={(value) => handleCompanySelect(value)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        {selectedCompany && selectedCompany !== "All" && (
                          <CompanyIcon company={selectedCompany} size={16} className="p-0" />
                        )}
                        {selectedCompany || "All Companies"}
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company} value={company}>
                        <div className="flex items-center gap-2">
                          {company !== "All" && (
                            <CompanyIcon company={company} size={16} className="p-0" />
                          )}
                          {company}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Difficulty Filter */}
              <div className="flex flex-col space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Difficulty</label>
                <Select
                  value={selectedDifficulty || "All"}
                  onValueChange={(value) => handleDifficultySelect(value)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        {selectedDifficulty && selectedDifficulty !== "All" && (
                          <div 
                            className={`w-3 h-3 rounded-full ${
                              selectedDifficulty === "Easy" ? "bg-green-500" :
                              selectedDifficulty === "Medium" ? "bg-amber-500" :
                              selectedDifficulty === "Hard" ? "bg-red-500" : ""
                            }`}
                          />
                        )}
                        {selectedDifficulty || "All Difficulties"}
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {difficulties.map((difficulty) => (
                      <SelectItem key={difficulty} value={difficulty}>
                        <div className="flex items-center gap-2">
                          {difficulty !== "All" && (
                            <div 
                              className={`w-3 h-3 rounded-full ${
                                difficulty === "Easy" ? "bg-green-500" :
                                difficulty === "Medium" ? "bg-amber-500" :
                                difficulty === "Hard" ? "bg-red-500" : ""
                              }`}
                            />
                          )}
                          {difficulty}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              Search
            </h2>
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                type="text"
                placeholder="Search system design problems..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* System Design Table */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              {selectedCategory || selectedCompany || selectedDifficulty
                ? [
                    selectedCategory && `${selectedCategory}`,
                    selectedCompany && `${selectedCompany}`,
                    selectedDifficulty && `${selectedDifficulty}`
                  ].filter(Boolean).join(" ") + " Problems"
                : "All System Design Problems"}
            </h2>
            <SystemDesignTable
              specs={specs}
              filteredCategory={selectedCategory}
              filteredCompany={selectedCompany}
              filteredDifficulty={selectedDifficulty}
              searchQuery={searchQuery}
              onToggleStar={toggleStar}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemDesign;
