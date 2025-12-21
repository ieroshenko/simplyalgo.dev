import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ProblemService } from "../problemService";

// Mock must be hoisted - define factory inline
vi.mock("@/integrations/supabase/client", () => ({
    supabase: {
        from: vi.fn(),
    },
}));

vi.mock("@/utils/logger", () => ({
    logger: {
        debug: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
    },
}));

// Import supabase after mocking
import { supabase } from "@/integrations/supabase/client";

// Type the mocked supabase
const mockSupabase = supabase as unknown as {
    from: ReturnType<typeof vi.fn>;
};

describe("ProblemService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    // ---------------------------------------------------------------------------
    // getAllWithRelations
    // ---------------------------------------------------------------------------
    describe("getAllWithRelations", () => {
        it("should fetch all problems with categories and test cases", async () => {
            const mockProblems = [
                {
                    id: "two-sum",
                    title: "Two Sum",
                    difficulty: "Easy",
                    categories: { name: "Arrays", color: "#4CAF50" },
                    test_cases: [{ input: "[1,2]", expected_output: "3" }],
                },
            ];

            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockResolvedValue({ data: mockProblems, error: null }),
            });

            const result = await ProblemService.getAllWithRelations();

            expect(mockSupabase.from).toHaveBeenCalledWith("problems");
            expect(result).toEqual(mockProblems);
        });

        it("should throw an error if the query fails", async () => {
            const mockError = { message: "Database error", code: "500" };

            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockResolvedValue({ data: null, error: mockError }),
            });

            await expect(ProblemService.getAllWithRelations()).rejects.toEqual(mockError);
        });

        it("should return empty array if no data", async () => {
            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockResolvedValue({ data: null, error: null }),
            });

            const result = await ProblemService.getAllWithRelations();
            expect(result).toEqual([]);
        });
    });

    // ---------------------------------------------------------------------------
    // getById
    // ---------------------------------------------------------------------------
    describe("getById", () => {
        it("should fetch a single problem by ID", async () => {
            const mockProblem = {
                id: "two-sum",
                title: "Two Sum",
                difficulty: "Easy",
                categories: { name: "Arrays", color: "#4CAF50" },
                test_cases: [],
            };

            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({ data: mockProblem, error: null }),
                    }),
                }),
            });

            const result = await ProblemService.getById("two-sum");

            expect(result).toEqual(mockProblem);
        });

        it("should return null if problem not found", async () => {
            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: null,
                            error: { code: "PGRST116", message: "Not found" },
                        }),
                    }),
                }),
            });

            const result = await ProblemService.getById("nonexistent");
            expect(result).toBeNull();
        });
    });

    // ---------------------------------------------------------------------------
    // getAllCategories
    // ---------------------------------------------------------------------------
    describe("getAllCategories", () => {
        it("should fetch all categories in order", async () => {
            const mockCategories = [
                { id: "1", name: "Arrays", color: "#4CAF50", sort_order: 1 },
                { id: "2", name: "Strings", color: "#2196F3", sort_order: 2 },
            ];

            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({ data: mockCategories, error: null }),
                }),
            });

            const result = await ProblemService.getAllCategories();

            expect(mockSupabase.from).toHaveBeenCalledWith("categories");
            expect(result).toEqual(mockCategories);
        });
    });

    // ---------------------------------------------------------------------------
    // getUserStars
    // ---------------------------------------------------------------------------
    describe("getUserStars", () => {
        it("should fetch user's starred problems", async () => {
            const mockStars = [{ problem_id: "two-sum" }, { problem_id: "valid-parentheses" }];

            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({ data: mockStars, error: null }),
                }),
            });

            const result = await ProblemService.getUserStars("user-123");

            expect(mockSupabase.from).toHaveBeenCalledWith("user_starred_problems");
            expect(result).toEqual(mockStars);
        });

        it("should return empty array if no stars", async () => {
            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
            });

            const result = await ProblemService.getUserStars("user-456");
            expect(result).toEqual([]);
        });
    });

    // ---------------------------------------------------------------------------
    // addStar / removeStar / toggleStar
    // ---------------------------------------------------------------------------
    describe("addStar", () => {
        it("should add a star to a problem", async () => {
            mockSupabase.from.mockReturnValue({
                insert: vi.fn().mockResolvedValue({ error: null }),
            });

            await expect(
                ProblemService.addStar("user-123", "two-sum")
            ).resolves.toBeUndefined();

            expect(mockSupabase.from).toHaveBeenCalledWith("user_starred_problems");
        });

        it("should throw if insert fails", async () => {
            const mockError = { message: "Insert failed" };

            mockSupabase.from.mockReturnValue({
                insert: vi.fn().mockResolvedValue({ error: mockError }),
            });

            await expect(ProblemService.addStar("user-123", "two-sum")).rejects.toEqual(
                mockError
            );
        });
    });

    describe("removeStar", () => {
        it("should remove a star from a problem", async () => {
            mockSupabase.from.mockReturnValue({
                delete: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        eq: vi.fn().mockResolvedValue({ error: null }),
                    }),
                }),
            });

            await expect(
                ProblemService.removeStar("user-123", "two-sum")
            ).resolves.toBeUndefined();
        });
    });

    describe("toggleStar", () => {
        it("should remove star if currently starred", async () => {
            mockSupabase.from.mockReturnValue({
                delete: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        eq: vi.fn().mockResolvedValue({ error: null }),
                    }),
                }),
            });

            const result = await ProblemService.toggleStar("user-123", "two-sum", true);
            expect(result).toBe(false);
        });

        it("should add star if not currently starred", async () => {
            mockSupabase.from.mockReturnValue({
                insert: vi.fn().mockResolvedValue({ error: null }),
            });

            const result = await ProblemService.toggleStar("user-123", "two-sum", false);
            expect(result).toBe(true);
        });
    });

    // ---------------------------------------------------------------------------
    // getUserAttemptStatuses
    // ---------------------------------------------------------------------------
    describe("getUserAttemptStatuses", () => {
        it("should fetch user attempt statuses", async () => {
            const mockStatuses = [
                { problem_id: "two-sum", status: "passed" },
                { problem_id: "three-sum", status: "failed" },
            ];

            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({ data: mockStatuses, error: null }),
                }),
            });

            const result = await ProblemService.getUserAttemptStatuses("user-123");
            expect(result).toEqual(mockStatuses);
        });
    });

    // ---------------------------------------------------------------------------
    // getUserSolvedProblemIds
    // ---------------------------------------------------------------------------
    describe("getUserSolvedProblemIds", () => {
        it("should return a set of solved problem IDs", async () => {
            const mockData = [{ problem_id: "two-sum" }, { problem_id: "three-sum" }];

            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        eq: vi.fn().mockResolvedValue({ data: mockData, error: null }),
                    }),
                }),
            });

            const result = await ProblemService.getUserSolvedProblemIds("user-123");

            expect(result).toBeInstanceOf(Set);
            expect(result.has("two-sum")).toBe(true);
            expect(result.has("three-sum")).toBe(true);
            expect(result.size).toBe(2);
        });
    });
});
