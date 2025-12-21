/**
 * Hook for managing test execution in Problem Solver
 */
import { useState, useCallback } from "react";
import { UserAttemptsService } from "@/services/userAttempts";
import { TestRunnerService } from "@/services/testRunner";
import { notifications } from "@/shared/services/notificationService";
import type { TestResult, Problem } from "@/types";

export interface UseTestExecutionProps {
    userId: string | undefined;
    problem: Problem | undefined;
    code: string;
    onProblemSolved: (difficulty: "Easy" | "Medium" | "Hard") => Promise<void>;
    optimisticAdd: (submission: unknown) => void;
    watchForAcceptance: (timeout: number, interval: number) => void;
    setShowBottomPanel: (show: boolean) => void;
}

export interface UseTestExecutionResult {
    /** Test results from last run */
    testResults: TestResult[];
    /** Whether tests are currently running */
    isRunning: boolean;
    /** Active test case index */
    activeTestCase: number;
    /** Set active test case */
    setActiveTestCase: (index: number) => void;
    /** Test panel size */
    testPanelSize: number;
    /** Run tests */
    handleRun: () => Promise<void>;
    /** Submit solution */
    handleSubmit: () => Promise<void>;
}

/**
 * Hook to manage test execution and submission
 */
export const useTestExecution = ({
    userId,
    problem,
    code,
    onProblemSolved,
    optimisticAdd,
    watchForAcceptance,
    setShowBottomPanel,
}: UseTestExecutionProps): UseTestExecutionResult => {
    const [testResults, setTestResults] = useState<TestResult[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [activeTestCase, setActiveTestCase] = useState(0);
    const [testPanelSize, setTestPanelSize] = useState(100);

    const handleRun = useCallback(async () => {
        if (!userId || !problem) return;

        setIsRunning(true);
        setTestResults([]);
        setActiveTestCase(0);

        // Ensure the test results panel is visible
        setShowBottomPanel(true);

        try {
            await UserAttemptsService.saveDraft(userId, problem.id, code);
            const response = await TestRunnerService.runCode({
                language: "python",
                code: code,
                testCases: problem.testCases,
                problemId: problem.id,
            });

            setTestResults(response.results);
            setTestPanelSize(250); // Expand test panel when results are received

            const passedCount = response.results.filter((r) => r.passed).length;
            const totalCount = response.results.length;

            if (passedCount === totalCount) {
                notifications.success("All tests passed! 🎉");
                const saved = await UserAttemptsService.markProblemSolved(
                    userId,
                    problem.id,
                    code,
                    response.results,
                );

                if (saved) {
                    optimisticAdd(saved);
                }

                watchForAcceptance(30_000, 2_000);
                await onProblemSolved(problem.difficulty as "Easy" | "Medium" | "Hard");
            } else {
                notifications.error(`${passedCount}/${totalCount} test cases passed`);
            }
        } catch (error) {
            notifications.error("Failed to run code");
        } finally {
            setIsRunning(false);
        }
    }, [userId, problem, code, onProblemSolved, optimisticAdd, watchForAcceptance, setShowBottomPanel]);

    const handleSubmit = useCallback(async () => {
        if (!userId || !problem) return;

        try {
            await UserAttemptsService.submitCode(userId, problem.id, code);
            notifications.success("Solution submitted successfully!");
            watchForAcceptance(60_000, 2_000);
        } catch (error) {
            notifications.error("Failed to submit solution");
        }
    }, [userId, problem, code, watchForAcceptance]);

    return {
        testResults,
        isRunning,
        activeTestCase,
        setActiveTestCase,
        testPanelSize,
        handleRun,
        handleSubmit,
    };
};
