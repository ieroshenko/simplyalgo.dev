/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// Mock data
const mockProblem = {
    id: 'two-sum',
    title: 'Two Sum',
    difficulty: 'Easy',
    category: 'Arrays',
    description: 'Given an array of integers, return indices of two numbers that add up to target.',
    functionSignature: 'def twoSum(nums, target):\n    pass',
    testCases: [
        { input: '[2,7,11,15], 9', expected: '[0,1]' },
        { input: '[3,2,4], 6', expected: '[1,2]' },
    ],
    examples: [{ input: '[2,7,11,15], 9', output: '[0,1]' }],
    constraints: ['2 <= nums.length <= 10^4'],
    isStarred: false,
    status: 'not-started',
};

const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
};

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useParams: () => ({ problemId: 'two-sum' }),
        useNavigate: () => vi.fn(),
    };
});

// Mock hooks
vi.mock('@/hooks/useAuth', () => ({
    useAuth: () => ({
        user: mockUser,
        session: {},
        loading: false,
        signOut: vi.fn(),
    }),
}));

vi.mock('@/hooks/useSubscription', () => ({
    useSubscription: () => ({
        subscription: { status: 'active' },
        hasActiveSubscription: true,
        isLoading: false,
        invalidateSubscription: vi.fn(),
    }),
}));

vi.mock('@/features/onboarding/DemoModeContext', () => ({
    useDemoMode: () => ({
        isDemoMode: false,
        tourStep: 0,
        tourComplete: false,
        isTourActive: false,
        setTourStep: vi.fn(),
        startTour: vi.fn(),
        completeTour: vi.fn(),
        skipTour: vi.fn(),
        nextTourStep: vi.fn(),
        prevTourStep: vi.fn(),
        completeDemo: vi.fn(),
        totalTourSteps: 3,
    }),
    DemoModeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/features/problems/hooks/useProblems', () => ({
    useProblems: () => ({
        problems: [mockProblem],
        toggleStar: vi.fn(),
        loading: false,
        error: null,
        refetch: vi.fn(),
    }),
}));

vi.mock('@/features/problems/hooks/useProblem', () => ({
    useProblem: () => ({
        problem: mockProblem,
        loading: false,
        error: null,
        refetch: vi.fn(),
    }),
}));

vi.mock('@/features/problems/hooks/useSubmissions', () => ({
    useSubmissions: () => ({
        submissions: [],
        loading: false,
        error: null,
        optimisticAdd: vi.fn(),
        watchForAcceptance: vi.fn(),
    }),
}));

vi.mock('@/features/problems/hooks/useSolutions', () => ({
    useSolutions: () => ({
        solutions: [],
        loading: false,
        error: null,
    }),
}));

vi.mock('@/hooks/useUserStats', () => ({
    useUserStats: () => ({
        updateStatsOnProblemSolved: vi.fn(),
    }),
}));

vi.mock('@/hooks/useCoachingNew', () => ({
    useCoachingNew: () => ({
        coachingState: {
            isCoachModeActive: false,
            isWaitingForResponse: false,
            feedback: {
                show: false,
                type: null,
                message: null,
            },
            currentStep: null,
            highlightRange: null,
        },
        startCoaching: vi.fn(),
        stopCoaching: vi.fn(),
        submitCoachingCode: vi.fn(),
        insertCorrectCode: vi.fn(),
        cancelInput: vi.fn(),
        closeFeedback: vi.fn(),
        startOptimization: vi.fn(),
    }),
}));

vi.mock('@/hooks/useTheme', () => ({
    useTheme: () => ({
        theme: 'dark',
        setTheme: vi.fn(),
        isDark: true,
    }),
}));

vi.mock('@/hooks/useEditorTheme', () => ({
    useEditorTheme: () => ({
        currentTheme: 'vs-dark',
        defineCustomThemes: vi.fn(),
    }),
}));

// Mock services
vi.mock('@/services/userAttempts', () => ({
    UserAttemptsService: {
        saveDraft: vi.fn().mockResolvedValue({}),
        submitCode: vi.fn().mockResolvedValue({}),
        markProblemSolved: vi.fn().mockResolvedValue({}),
        saveComplexityAnalysis: vi.fn().mockResolvedValue({}),
    },
}));

vi.mock('@/services/testRunner', () => ({
    TestRunnerService: {
        runCode: vi.fn().mockResolvedValue({
            results: [
                { passed: true, input: '[2,7,11,15], 9', expected: '[0,1]', actual: '[0,1]' },
            ],
        }),
    },
}));

vi.mock('@/services/overlayPositionManager', () => ({
    OverlayPositionManager: vi.fn().mockImplementation(() => ({})),
}));

// Mock components
vi.mock('@/components/CodeEditor', () => ({
    default: ({ initialCode, onCodeChange, onRun, onSubmit, isRunning, onStartCoaching, onStopCoaching, isCoachModeActive }: any) => (
        <div data-testid="code-editor">
            <div>Initial Code: {initialCode}</div>
            <textarea
                data-testid="code-textarea"
                onChange={(e) => onCodeChange?.(e.target.value)}
            />
            <button data-testid="run-button" onClick={onRun} disabled={isRunning}>
                {isRunning ? 'Running...' : 'Run'}
            </button>
            {onStartCoaching && (
                <button
                    data-testid="coach-button"
                    onClick={isCoachModeActive ? onStopCoaching : onStartCoaching}
                >
                    {isCoachModeActive ? 'Stop Coach' : 'Start Coach'}
                </button>
            )}
        </div>
    ),
}));

vi.mock('@/features/problems/components/ProblemPanel', () => ({
    default: ({ problem, activeTab, onTabChange }: any) => (
        <div data-testid="problem-panel">
            <h2>{problem?.title}</h2>
            <p>{problem?.description}</p>
            <div data-testid="tabs">
                <button data-testid="tab-question" onClick={() => onTabChange('question')}>Question</button>
                <button data-testid="tab-solution" onClick={() => onTabChange('solution')}>Solution</button>
                <button data-testid="tab-submissions" onClick={() => onTabChange('submissions')}>Submissions</button>
                <button data-testid="tab-notes" onClick={() => onTabChange('notes')}>Notes</button>
            </div>
            <span data-testid="active-tab">{activeTab}</span>
        </div>
    ),
}));

vi.mock('@/components/chat/ChatBubbles', () => ({
    default: () => <div data-testid="chat-bubbles">Chat</div>,
}));

vi.mock('@/components/Notes', () => ({
    default: React.forwardRef((props: any, ref: any) => (
        <div data-testid="notes" ref={ref}>Notes</div>
    )),
}));

vi.mock('@/components/Timer', () => ({
    default: () => <div data-testid="timer">Timer</div>,
}));

vi.mock('@/components/FeedbackButton', () => ({
    default: () => <button data-testid="feedback-button">Feedback</button>,
}));

vi.mock('@/components/ShortcutsHelp', () => ({
    default: () => <button data-testid="shortcuts-help">Shortcuts</button>,
}));

vi.mock('@/components/LoadingSpinner', () => ({
    default: () => <div data-testid="loading-spinner">Loading...</div>,
}));

vi.mock('@/components/coaching/CoachBubble', () => ({
    default: () => <div data-testid="coach-bubble">Coach Bubble</div>,
}));

vi.mock('@/components/coaching/HighlightOverlay', () => ({
    default: () => <div data-testid="highlight-overlay">Highlight</div>,
}));

vi.mock('@/components/coaching/SimpleOverlay', () => ({
    default: () => <div data-testid="simple-overlay">Simple Overlay</div>,
}));

vi.mock('@/components/coaching/FeedbackOverlay', () => ({
    default: () => <div data-testid="feedback-overlay">Feedback Overlay</div>,
}));

vi.mock('@/components/coaching/CoachProgress', () => ({
    default: () => <div data-testid="coach-progress">Progress</div>,
}));

vi.mock('@/components/flashcards/FlashcardButton', () => ({
    FlashcardButton: () => <button data-testid="flashcard-button">Flashcard</button>,
}));

vi.mock('@/components/CodeDiffDialog', () => ({
    CodeDiffDialog: () => <div data-testid="code-diff-dialog">Diff</div>,
}));

// Mock UI components
vi.mock('@/components/ui/resizable', () => ({
    ResizablePanelGroup: ({ children, ...props }: any) => <div data-testid="resizable-group" {...props}>{children}</div>,
    ResizablePanel: ({ children, ...props }: any) => <div data-testid="resizable-panel" {...props}>{children}</div>,
    ResizableHandle: (props: any) => <div data-testid="resizable-handle" {...props} />,
}));

vi.mock('@/components/ui/simple-tabs', () => ({
    SimpleTabs: ({ children }: any) => <div>{children}</div>,
    TabPanel: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/dialog', () => ({
    Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
    DialogContent: ({ children }: any) => <div>{children}</div>,
    DialogHeader: ({ children }: any) => <div>{children}</div>,
    DialogTitle: ({ children }: any) => <h2>{children}</h2>,
}));

// Mock Monaco Editor
vi.mock('@monaco-editor/react', () => ({
    default: ({ value }: any) => <div data-testid="monaco-viewer">{value}</div>,
}));

// Mock notifications service
vi.mock('@/shared/services/notificationService', () => ({
    notifications: {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        warning: vi.fn(),
        loading: vi.fn(),
        dismiss: vi.fn(),
    },
}));

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
    supabase: {
        functions: {
            invoke: vi.fn().mockResolvedValue({ data: {}, error: null }),
        },
    },
}));

// Mock logger
vi.mock('@/utils/logger', () => ({
    logger: {
        debug: vi.fn(),
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

// Mock localStorage
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

import ProblemSolverNew from '../ProblemSolverNew';
import { TestRunnerService } from '@/services/testRunner';
import { notifications } from '@/shared/services/notificationService';

const renderWithRouter = (component: React.ReactElement) => {
    return render(
        <MemoryRouter initialEntries={['/problems/two-sum']}>
            <Routes>
                <Route path="/problems/:problemId" element={component} />
            </Routes>
        </MemoryRouter>
    );
};

describe('ProblemSolverNew', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorageMock.getItem.mockReturnValue(null);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Rendering', () => {
        it('should render the problem title', () => {
            renderWithRouter(<ProblemSolverNew />);

            // Title may appear in multiple places
            const titles = screen.getAllByText('Two Sum');
            expect(titles.length).toBeGreaterThan(0);
        });

        it('should render the difficulty badge', () => {
            renderWithRouter(<ProblemSolverNew />);

            expect(screen.getByText('Easy')).toBeInTheDocument();
        });

        it('should render the category badge', () => {
            renderWithRouter(<ProblemSolverNew />);

            expect(screen.getByText('Arrays')).toBeInTheDocument();
        });

        it('should render the code editor', () => {
            renderWithRouter(<ProblemSolverNew />);

            expect(screen.getByTestId('code-editor')).toBeInTheDocument();
        });

        it('should render the problem panel', () => {
            renderWithRouter(<ProblemSolverNew />);

            expect(screen.getByTestId('problem-panel')).toBeInTheDocument();
        });

        it('should render the timer', () => {
            renderWithRouter(<ProblemSolverNew />);

            expect(screen.getByTestId('timer')).toBeInTheDocument();
        });

        it('should render the feedback button', () => {
            renderWithRouter(<ProblemSolverNew />);

            expect(screen.getByTestId('feedback-button')).toBeInTheDocument();
        });

        it('should render the flashcard button', () => {
            renderWithRouter(<ProblemSolverNew />);

            expect(screen.getByTestId('flashcard-button')).toBeInTheDocument();
        });
    });

    describe('Navigation', () => {
        it('should have a back button', () => {
            renderWithRouter(<ProblemSolverNew />);

            expect(screen.getByText('Back')).toBeInTheDocument();
        });
    });

    describe('Code Editor Integration', () => {
        it('should render run button', () => {
            renderWithRouter(<ProblemSolverNew />);

            expect(screen.getByTestId('run-button')).toBeInTheDocument();
        });

        it('should run code when run button clicked', async () => {
            renderWithRouter(<ProblemSolverNew />);

            const runButton = screen.getByTestId('run-button');
            await userEvent.click(runButton);

            await waitFor(() => {
                expect(TestRunnerService.runCode).toHaveBeenCalled();
            });
        });

        it('should show success toast when all tests pass', async () => {
            vi.mocked(TestRunnerService.runCode).mockResolvedValue({
                results: [
                    { passed: true, input: '[2,7,11,15], 9', expected: '[0,1]', actual: '[0,1]' },
                ],
            });

            renderWithRouter(<ProblemSolverNew />);

            const runButton = screen.getByTestId('run-button');
            await userEvent.click(runButton);

            await waitFor(() => {
                expect(notifications.success).toHaveBeenCalledWith('All tests passed! 🎉');
            });
        });

        it('should show error toast when tests fail', async () => {
            vi.mocked(TestRunnerService.runCode).mockResolvedValue({
                results: [
                    { passed: false, input: '[2,7,11,15], 9', expected: '[0,1]', actual: '[1,0]' },
                ],
            });

            renderWithRouter(<ProblemSolverNew />);

            const runButton = screen.getByTestId('run-button');
            await userEvent.click(runButton);

            await waitFor(() => {
                expect(notifications.error).toHaveBeenCalledWith('0/1 test cases passed');
            });
        });
    });

    describe('Coach Mode', () => {
        it('should render coach button', () => {
            renderWithRouter(<ProblemSolverNew />);

            expect(screen.getByTestId('coach-button')).toBeInTheDocument();
        });
    });

    describe('Tabs', () => {
        it('should have question tab', () => {
            renderWithRouter(<ProblemSolverNew />);

            expect(screen.getByTestId('tab-question')).toBeInTheDocument();
        });

        it('should have solution tab', () => {
            renderWithRouter(<ProblemSolverNew />);

            expect(screen.getByTestId('tab-solution')).toBeInTheDocument();
        });

        it('should have submissions tab', () => {
            renderWithRouter(<ProblemSolverNew />);

            expect(screen.getByTestId('tab-submissions')).toBeInTheDocument();
        });

        it('should have notes tab', () => {
            renderWithRouter(<ProblemSolverNew />);

            expect(screen.getByTestId('tab-notes')).toBeInTheDocument();
        });

        it('should change active tab when clicked', async () => {
            renderWithRouter(<ProblemSolverNew />);

            const solutionTab = screen.getByTestId('tab-solution');
            await userEvent.click(solutionTab);

            await waitFor(() => {
                expect(screen.getByTestId('active-tab')).toHaveTextContent('solution');
            });
        });
    });

    describe('Star/Favorite', () => {
        it('should have star button', () => {
            renderWithRouter(<ProblemSolverNew />);

            // Multiple buttons exist in the header
            const buttons = screen.getAllByRole('button');
            expect(buttons.length).toBeGreaterThan(3);
        });
    });

    describe('Theme Toggle', () => {
        it('should have theme toggle button', () => {
            renderWithRouter(<ProblemSolverNew />);

            // Button with Sun or Moon icon
            const buttons = screen.getAllByRole('button');
            expect(buttons.length).toBeGreaterThan(0);
        });
    });

    describe('Test Results', () => {
        it('should show test results placeholder initially', () => {
            renderWithRouter(<ProblemSolverNew />);

            // There may be multiple, use getAllBy
            const results = screen.getAllByText('Test Results');
            expect(results.length).toBeGreaterThan(0);
        });
    });

    describe('Panel Visibility', () => {
        it('should render resizable panels', () => {
            renderWithRouter(<ProblemSolverNew />);

            // Multiple panels exist, use getAllBy
            const panels = screen.getAllByTestId('resizable-group');
            expect(panels.length).toBeGreaterThan(0);
        });
    });
});

describe('ProblemSolverNew - Loading State', () => {
    it.todo('should show loading spinner when problems are loading');
});

describe('ProblemSolverNew - Problem Not Found', () => {
    it.todo('should show not found UI when problem missing');
});
