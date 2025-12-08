
⏺ Test infrastructure is ready. Now here's the complete incremental testing roadmap:

  ---
  Complete Testing Roadmap - All Functionality to Test

  Phase A: Fix Existing Tests First (13 failing)

  | File                                                    | Tests to Fix                     |
  |---------------------------------------------------------|----------------------------------|
  | src/services/__tests__/overlayPositionManager.test.ts   | Position saving, bounds handling |
  | src/services/__tests__/editorBoundsCalculator.test.ts   | DOM calculations                 |
  | src/services/__tests__/positionCalculationUtils.test.ts | Utility functions                |

  ---
  Phase B: Service Layer Tests (Expand Existing)

  | Service                      | Functionality to Test                            |
  |------------------------------|--------------------------------------------------|
  | localStorageService.ts       | ✓ Already tested                                 |
  | testRunner.ts                | Code execution, result parsing, timeout handling |
  | userAttempts.ts              | Attempt recording, retrieval, status updates     |
  | technicalInterviewService.ts | Session management, question flow                |
  | feedbackService.ts           | Feedback submission, retrieval                   |
  | surveyService.ts             | Survey creation, response handling               |

  ---
  Phase C: Hook Tests (Critical Data Layer)

  | Hook                      | Functionality to Test
                     |
  |---------------------------|--------------------------------------------------------------------------------------------
  -------------------|
  | useChatSession.ts         | Message deduplication, streaming responses, diagram payloads, code snippet normalization,
  session persistence |
  | useSubmissions.ts         | Fetch submissions, realtime subscriptions, race condition handling, optimistic updates
                     |
  | useProblems.ts            | Fetch all problems, filtering by category/difficulty, search functionality, caching
                     |
  | useAuth.ts                | Login, logout, session refresh, auth state changes
                     |
  | useSystemDesignSession.ts | Session lifecycle, board state management, auto-save, response handling
                     |
  | useCoachingNew.ts         | Mode transitions, position management, hint generation, validation feedback
                     |
  | useTechnicalInterview.ts  | Interview flow, question navigation, recording state
                     |
  | useBehavioralQuestions.ts | Question fetching, filtering, STAR format validation
                     |
  | useFlashcards.ts          | Card fetching, review state, spaced repetition logic
                     |
  | useSpeechToText.ts        | Recognition start/stop, transcript handling, browser compatibility
                     |

  ---
  Phase D: Component Tests (UI Layer)

  D1. P0 - Core Components (Must Have)

  | Component            | Functionality to Test
                                              |
  |----------------------|-------------------------------------------------------------------------------------------------
  --------------------------------------------|
  | ProblemSolverNew.tsx | Tab switching (question/hints/solutions/notes), panel toggles, keyboard shortcuts, code editor
  integration, test execution, submission flow |
  | AIChat.tsx           | Message rendering, streaming indicator, code block display, diagram rendering, auto-scroll, copy
   code functionality                         |
  | CodeEditor.tsx       | Monaco integration, language switching, theme changes, VIM mode toggle, code execution trigger
                                              |
  | Sidebar.tsx          | Navigation items, collapsible behavior, active route highlighting, admin visibility
                                              |

  D2. P1 - Feature Components

  | Component                    | Functionality to Test                                                          |
  |------------------------------|--------------------------------------------------------------------------------|
  | AdminDashboardNew.tsx        | Data loading states, stats display, problem management actions                 |
  | AdminProblemDialog.tsx       | Form validation, test case editor, save/update actions                         |
  | FlashcardReviewInterface.tsx | Card flip animation, rating buttons, progress tracking, session completion     |
  | DesignCanvas.tsx             | Node creation/deletion, edge connections, drag/drop, zoom/pan                  |
  | SimpleOverlay.tsx            | Positioning, dragging, minimize/maximize, preset positions, validation display |
  | ChatBubbles.tsx              | Message bubbles, timestamp display, loading states                             |

  D3. P2 - Secondary Components

  | Component                   | Functionality to Test                                    |
  |-----------------------------|----------------------------------------------------------|
  | ProblemPanel.tsx            | Problem display, example rendering, submission list      |
  | TestCasePanel.tsx           | Test case switching, input/output display, result status |
  | SubmissionsList.tsx         | Submission history, expand/collapse, status indicators   |
  | NotesEditor.tsx             | Text input, auto-save, markdown preview                  |
  | BehavioralPractice.tsx      | Question display, recording state, feedback display      |
  | BehavioralMockInterview.tsx | Interview timer, question flow, completion state         |
  | TechnicalInterview.tsx      | Code prompt, voice recording, AI feedback                |
  | SystemDesignSolver.tsx      | Problem display, canvas integration, evaluation flow     |

  D4. P3 - UI Components (Snapshot Tests)

  All 52 shadcn components in src/components/ui/:
  - Button, Input, Select, Dialog, Card, Toast, etc.
  - Focus on visual regression, not behavior

  ---
  Phase E: Page Integration Tests

  | Page               | Functionality to Test                                      |
  |--------------------|------------------------------------------------------------|
  | Landing.tsx        | Hero rendering, navigation links, auth buttons             |
  | Auth.tsx           | Login form, signup form, validation, redirect on success   |
  | Dashboard.tsx      | User stats, recent activity, problem progress              |
  | Problems.tsx       | Problem list, filtering, sorting, pagination               |
  | Profile.tsx        | User info display, edit functionality, subscription status |
  | AdminDashboard.tsx | Admin-only access, problem CRUD, user management           |

  ---
  Phase F: Playwright E2E Tests

  | Flow                 | Test Scenarios
    |
  |----------------------|-------------------------------------------------------------------------------------------------
  --|
  | Authentication       | Sign up new user, login existing user, logout, session persistence, protected route redirect
    |
  | Problem Solving      | Navigate to problem, write code, run tests, view results, submit solution, see submission
  history |
  | Coaching Mode        | Activate coaching, receive hints, view validation feedback, complete problem with guidance
    |
  | Flashcard Review     | Start review session, flip cards, rate recall, complete session, track streak
    |
  | System Design        | Start session, add components to canvas, connect components, get AI feedback
    |
  | Behavioral Interview | Select question, record response, get AI feedback, view evaluation
    |

  ---
  Recommended Order of Implementation

  1. Fix 13 existing failing tests
  2. useAuth.ts hook tests (foundation for all authenticated features)
  3. useProblems.ts hook tests (core data fetching)
  4. useSubmissions.ts hook tests (realtime critical)
  5. useChatSession.ts hook tests (AI chat critical)
  6. CodeEditor.tsx component tests
  7. ProblemSolverNew.tsx component tests
  8. AIChat.tsx component tests
  9. Sidebar.tsx component tests
  10. AdminDashboardNew.tsx component tests
  11. FlashcardReviewInterface.tsx component tests
  12. UI component snapshot tests (batch)
  13. Playwright setup + auth E2E
  14. Problem solving E2E flow
  15. Remaining E2E flows

  ---
  Want me to start with Step 1: Fix the 13 existing failing tests, or jump to Step 2: Write useAuth hook tests?