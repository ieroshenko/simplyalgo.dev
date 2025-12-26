import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { ProblemSelector } from "../ProblemSelector";
import { Problem } from "@/types";

// Mock react-router-dom navigation
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockProblems: Problem[] = [
  {
    id: "1",
    title: "Two Sum",
    difficulty: "Easy",
    category: "Array",
    status: "solved",
    description: "Test description",
    examples: [],
    constraints: [],
    hints: [],
    starter_code: "",
    solution: "",
    test_cases: [],
    isStarred: false,
  },
  {
    id: "2",
    title: "Add Two Numbers",
    difficulty: "Medium",
    category: "Linked List",
    status: "attempted",
    description: "Test description",
    examples: [],
    constraints: [],
    hints: [],
    starter_code: "",
    solution: "",
    test_cases: [],
    isStarred: false,
  },
  {
    id: "3",
    title: "Longest Substring Without Repeating Characters",
    difficulty: "Hard",
    category: "String",
    status: undefined,
    description: "Test description",
    examples: [],
    constraints: [],
    hints: [],
    starter_code: "",
    solution: "",
    test_cases: [],
    isStarred: false,
  },
];

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe("ProblemSelector", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it("renders the Problems button", () => {
    renderWithRouter(
      <ProblemSelector problems={mockProblems} currentProblemId="1" />
    );

    expect(screen.getByRole("button", { name: /problems/i })).toBeInTheDocument();
  });

  it("opens dropdown when button is clicked", () => {
    renderWithRouter(
      <ProblemSelector problems={mockProblems} currentProblemId="1" />
    );

    const button = screen.getByRole("button", { name: /problems/i });
    fireEvent.click(button);

    expect(screen.getByPlaceholderText(/search problems/i)).toBeInTheDocument();
  });

  it("displays all problems in the dropdown", () => {
    renderWithRouter(
      <ProblemSelector problems={mockProblems} currentProblemId="1" />
    );

    const button = screen.getByRole("button", { name: /problems/i });
    fireEvent.click(button);

    expect(screen.getByText("Two Sum")).toBeInTheDocument();
    expect(screen.getByText("Add Two Numbers")).toBeInTheDocument();
    expect(screen.getByText("Longest Substring Without Repeating Characters")).toBeInTheDocument();
  });

  it("highlights the current problem", () => {
    renderWithRouter(
      <ProblemSelector problems={mockProblems} currentProblemId="1" />
    );

    const button = screen.getByRole("button", { name: /problems/i });
    fireEvent.click(button);

    const currentProblemButton = screen.getByText("Two Sum").closest("button");
    expect(currentProblemButton).toHaveClass("bg-muted");
  });

  it("filters problems based on search query", () => {
    renderWithRouter(
      <ProblemSelector problems={mockProblems} currentProblemId="1" />
    );

    const button = screen.getByRole("button", { name: /problems/i });
    fireEvent.click(button);

    const searchInput = screen.getByPlaceholderText(/search problems/i);
    fireEvent.change(searchInput, { target: { value: "Two" } });

    expect(screen.getByText("Two Sum")).toBeInTheDocument();
    expect(screen.getByText("Add Two Numbers")).toBeInTheDocument();
    expect(screen.queryByText("Longest Substring Without Repeating Characters")).not.toBeInTheDocument();
  });

  it("shows 'No problems found' when search has no results", () => {
    renderWithRouter(
      <ProblemSelector problems={mockProblems} currentProblemId="1" />
    );

    const button = screen.getByRole("button", { name: /problems/i });
    fireEvent.click(button);

    const searchInput = screen.getByPlaceholderText(/search problems/i);
    fireEvent.change(searchInput, { target: { value: "NonExistent" } });

    expect(screen.getByText(/no problems found/i)).toBeInTheDocument();
  });

  it("navigates to selected problem", async () => {
    renderWithRouter(
      <ProblemSelector problems={mockProblems} currentProblemId="1" />
    );

    const button = screen.getByRole("button", { name: /problems/i });
    fireEvent.click(button);

    const problemButton = screen.getByText("Add Two Numbers").closest("button");
    fireEvent.click(problemButton!);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/problems/2");
    });
  });

  it("closes dropdown after selecting a problem", async () => {
    renderWithRouter(
      <ProblemSelector problems={mockProblems} currentProblemId="1" />
    );

    const button = screen.getByRole("button", { name: /problems/i });
    fireEvent.click(button);

    const problemButton = screen.getByText("Add Two Numbers").closest("button");
    fireEvent.click(problemButton!);

    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/search problems/i)).not.toBeInTheDocument();
    });
  });

  it("displays correct difficulty badges", () => {
    renderWithRouter(
      <ProblemSelector problems={mockProblems} currentProblemId="1" />
    );

    const button = screen.getByRole("button", { name: /problems/i });
    fireEvent.click(button);

    expect(screen.getByText("Easy")).toBeInTheDocument();
    expect(screen.getByText("Medium")).toBeInTheDocument();
    expect(screen.getByText("Hard")).toBeInTheDocument();
  });

  it("displays problem count in footer", () => {
    renderWithRouter(
      <ProblemSelector problems={mockProblems} currentProblemId="1" />
    );

    const button = screen.getByRole("button", { name: /problems/i });
    fireEvent.click(button);

    expect(screen.getByText(/3 problems/i)).toBeInTheDocument();
  });

  it("updates problem count when filtering", () => {
    renderWithRouter(
      <ProblemSelector problems={mockProblems} currentProblemId="1" />
    );

    const button = screen.getByRole("button", { name: /problems/i });
    fireEvent.click(button);

    const searchInput = screen.getByPlaceholderText(/search problems/i);
    fireEvent.change(searchInput, { target: { value: "Two" } });

    expect(screen.getByText(/2 problems matching "Two"/i)).toBeInTheDocument();
  });

  it("closes dropdown when clicking outside", async () => {
    renderWithRouter(
      <ProblemSelector problems={mockProblems} currentProblemId="1" />
    );

    const button = screen.getByRole("button", { name: /problems/i });
    fireEvent.click(button);

    expect(screen.getByPlaceholderText(/search problems/i)).toBeInTheDocument();

    // Click outside
    fireEvent.mouseDown(document.body);

    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/search problems/i)).not.toBeInTheDocument();
    });
  });

  it("shows correct status icons for problems", () => {
    renderWithRouter(
      <ProblemSelector problems={mockProblems} currentProblemId="1" />
    );

    const button = screen.getByRole("button", { name: /problems/i });
    fireEvent.click(button);

    // Check that problems are displayed (icons are rendered as SVGs)
    expect(screen.getByText("Two Sum")).toBeInTheDocument();
    expect(screen.getByText("Add Two Numbers")).toBeInTheDocument();
    expect(screen.getByText("Longest Substring Without Repeating Characters")).toBeInTheDocument();
  });

  it("handles empty problems list", () => {
    renderWithRouter(
      <ProblemSelector problems={[]} currentProblemId={undefined} />
    );

    const button = screen.getByRole("button", { name: /problems/i });
    fireEvent.click(button);

    expect(screen.getByText(/no problems found/i)).toBeInTheDocument();
    expect(screen.getByText(/0 problems/i)).toBeInTheDocument();
  });

  it("clears search when closing dropdown", async () => {
    renderWithRouter(
      <ProblemSelector problems={mockProblems} currentProblemId="1" />
    );

    const button = screen.getByRole("button", { name: /problems/i });

    // Open and search
    fireEvent.click(button);
    const searchInput = screen.getByPlaceholderText(/search problems/i);
    fireEvent.change(searchInput, { target: { value: "Two" } });

    // Verify search is working
    expect(screen.getByText("Two Sum")).toBeInTheDocument();
    expect(screen.getByText("Add Two Numbers")).toBeInTheDocument();

    // Select a problem (closes dropdown)
    const problemButton = screen.getByText("Two Sum").closest("button");
    fireEvent.click(problemButton!);

    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/search problems/i)).not.toBeInTheDocument();
    });

    // Reopen and check search is cleared
    fireEvent.click(button);
    const newSearchInput = screen.getByPlaceholderText(/search problems/i);
    expect(newSearchInput).toHaveValue("");
  });
});
