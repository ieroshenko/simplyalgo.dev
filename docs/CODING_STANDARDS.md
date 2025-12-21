# 📐 SimplyAlgo Coding Standards

> **Version**: 1.0  
> **Last Updated**: December 2025  
> **Status**: Active

This document defines the coding standards, patterns, and best practices for the SimplyAlgo codebase. **All new code should follow these guidelines.**

---

## 📖 Table of Contents

1. [Project Architecture](#project-architecture)
2. [File Structure](#file-structure)
3. [TypeScript Standards](#typescript-standards)
4. [React Patterns](#react-patterns)
5. [State Management](#state-management)
6. [Error Handling](#error-handling)
7. [Logging](#logging)
8. [Database Access](#database-access)
9. [Testing](#testing)
10. [Analytics](#analytics)
11. [Available Utilities](#available-utilities)
12. [Component Guidelines](#component-guidelines)
13. [Performance](#performance)
14. [Security](#security)

---

## 🏗️ Project Architecture

### Feature-Based Structure

We use a **feature-based** folder structure. Related code lives together.

```
src/
├── features/                    # Feature modules (primary code location)
│   ├── problems/
│   │   ├── components/         # Feature-specific components
│   │   ├── hooks/              # Feature-specific hooks
│   │   ├── types.ts            # Feature types
│   │   └── ProblemSolverPage.tsx
│   ├── behavioral/
│   ├── flashcards/
│   └── admin/
│
├── shared/                      # Shared across features
│   ├── hooks/                  # Reusable hooks (useAsyncState, etc.)
│   ├── services/               # Notification service, etc.
│   └── queries/                # Supabase query builders
│
├── services/                    # Data services (ProblemService, etc.)
│
├── components/                  # Shared UI components
│   ├── ui/                     # shadcn/ui components
│   ├── chat/                   # Chat components
│   └── flashcards/             # Flashcard components
│
├── hooks/                       # Global hooks (useAuth, useSubscription)
│
├── utils/                       # Pure utility functions
│   ├── logger.ts               # Logging utility
│   ├── uiUtils.ts              # UI utilities (getDifficultyColor, etc.)
│   └── code.ts                 # Code utilities
│
├── types/                       # Global TypeScript types
│
└── integrations/                # Third-party integrations
    └── supabase/
```

### When to Create a New Feature Folder

✅ **DO** create a new feature folder when:
- Building a new user-facing feature (e.g., `/flashcards`, `/behavioral`)
- Feature has 3+ components or 2+ hooks
- Feature is self-contained and could theoretically be deleted without breaking others

❌ **DON'T** create a feature folder for:
- Single utility functions (put in `utils/`)
- Single shared components (put in `components/`)
- Configuration files

---

## 📁 File Structure

### Component File Structure

```typescript
// 1. Imports (grouped)
import { useState, useEffect } from "react";           // React
import { Button } from "@/components/ui/button";       // UI components
import { useAuth } from "@/hooks/useAuth";             // Hooks
import { ProblemService } from "@/services/problemService"; // Services
import { logger } from "@/utils/logger";               // Utils
import type { Problem } from "./types";                // Types (last)

// 2. Types (if not in separate file)
interface ComponentProps {
  problemId: string;
  onComplete: () => void;
}

// 3. Constants
const CACHE_TIME = 5 * 60 * 1000; // 5 minutes

// 4. Component
export const MyComponent = ({ problemId, onComplete }: ComponentProps) => {
  // ... implementation
};
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `ProblemCard.tsx` |
| Hooks | camelCase with `use` prefix | `useProblems.ts` |
| Utils | camelCase | `formatDate.ts` |
| Types | PascalCase | `Problem`, `UserSession` |
| Services | PascalCase with `Service` suffix | `ProblemService.ts` |
| Test files | Same name + `.test.ts` | `useProblems.test.ts` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_RETRIES` |

---

## 🔷 TypeScript Standards

### Strict Type Safety

```typescript
// ✅ DO: Explicit types for function parameters and returns
const fetchProblem = async (id: string): Promise<Problem | null> => {
  // ...
};

// ❌ DON'T: Implicit `any` or loose typing
const fetchProblem = async (id) => {
  // ...
};
```

### Type vs Interface

```typescript
// Use `interface` for object shapes that may be extended
interface User {
  id: string;
  name: string;
}

// Use `type` for unions, intersections, or computed types
type Difficulty = "Easy" | "Medium" | "Hard";
type UserWithRole = User & { role: string };
```

### Avoid `any`

```typescript
// ✅ DO: Use `unknown` and narrow the type
const handleError = (error: unknown) => {
  if (error instanceof Error) {
    logger.error("Error:", error);
  }
};

// ❌ DON'T: Use `any`
const handleError = (error: any) => {
  console.log(error.message); // Unsafe
};
```

### Use Type Imports

```typescript
// ✅ DO: Use `type` import for types
import type { Problem } from "@/types";

// ❌ DON'T: Mix runtime and type imports
import { Problem } from "@/types"; // If Problem is only a type
```

---

## ⚛️ React Patterns

### Functional Components Only

```typescript
// ✅ DO: Functional component with explicit props
export const ProblemCard = ({ problem, onSelect }: ProblemCardProps) => {
  return <div onClick={() => onSelect(problem.id)}>{problem.title}</div>;
};

// ❌ DON'T: Class components
class ProblemCard extends React.Component { ... }
```

### Custom Hooks for Logic

Extract complex logic into custom hooks:

```typescript
// ✅ DO: Custom hook for data fetching
const useProblemData = (problemId: string) => {
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    ProblemService.getById(problemId)
      .then(setProblem)
      .finally(() => setLoading(false));
  }, [problemId]);
  
  return { problem, loading };
};

// ❌ DON'T: All logic in component
const ProblemPage = () => {
  // 200 lines of fetching, processing, etc.
};
```

### Component Size Limits

| Size | Action |
|------|--------|
| < 200 lines | ✅ Good |
| 200-400 lines | ⚠️ Consider splitting |
| > 400 lines | ❌ Must split |

---

## 🔄 State Management

### For Async Operations: Use `useAsyncState`

```typescript
import { useAsyncState } from "@/shared/hooks/useAsyncState";

const MyComponent = () => {
  const { data, loading, error, setData, setLoading, setError, reset } = 
    useAsyncState<Problem[]>();
  
  const fetchData = async () => {
    setLoading(true);
    try {
      const problems = await ProblemService.getAll();
      setData(problems); // Automatically clears loading and error
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  };
  
  // ...
};
```

### For Server Data: Use React Query

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const useProblems = () => {
  return useQuery({
    queryKey: ["problems"],
    queryFn: () => ProblemService.getAll(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
```

### State Location Guide

| State Type | Location |
|------------|----------|
| UI state (modals, toggles) | `useState` in component |
| Form state | `useState` or React Hook Form |
| Server data | React Query |
| Async operation state | `useAsyncState` |
| Global app state | Context (sparingly) |

---

## ⚠️ Error Handling

### Use `getErrorMessage` Utility

```typescript
import { getErrorMessage } from "@/utils/uiUtils";

// ✅ DO: Use utility for consistent error extraction
try {
  await someAsyncOperation();
} catch (err) {
  const message = getErrorMessage(err, "Operation failed");
  setError(message);
  notifications.error(message);
}

// ❌ DON'T: Manual error checking
try {
  await someAsyncOperation();
} catch (err) {
  const message = err instanceof Error ? err.message : "Unknown error";
  // ...
}
```

### Error Types

```typescript
// For user-facing errors, use string messages
setError("Failed to load problem");

// For logging, preserve the full error object
logger.error("[Component] Operation failed", error);
```

### Try-Catch Pattern

```typescript
const handleSubmit = async () => {
  setLoading(true);
  try {
    await ProblemService.submit(data);
    notifications.success("Submitted successfully!");
    onClose();
  } catch (err) {
    logger.error("[Submit] Failed", err);
    notifications.error(getErrorMessage(err, "Failed to submit"));
  } finally {
    setLoading(false);
  }
};
```

---

## 📝 Logging

### Use the `logger` Utility

```typescript
import { logger } from "@/utils/logger";

// ✅ DO: Use logger with component context
logger.debug("[ProblemSolver] Loaded problem", { problemId });
logger.info("[Auth] User logged in", { userId });
logger.warn("[Payment] Retry attempt", { attempt: 2 });
logger.error("[API] Request failed", error, { endpoint: "/problems" });

// ❌ DON'T: Use console directly
console.log("Loaded problem", problemId);
console.error("Error:", error);
```

### Log Levels

| Level | When to Use |
|-------|-------------|
| `debug` | Development debugging, state changes |
| `info` | Important events (login, purchases) |
| `warn` | Recoverable issues, deprecation warnings |
| `error` | Errors that affect functionality |

### Log Format

Always include component context in brackets:

```typescript
logger.debug("[ComponentName] Action description", { relevantData });
```

---

## 🗄️ Database Access

### Use Service Classes

```typescript
// ✅ DO: Use service for database access
import { ProblemService } from "@/services/problemService";

const problems = await ProblemService.getAllWithRelations();
const problem = await ProblemService.getById(id);
await ProblemService.toggleStar(userId, problemId, isStarred);

// ❌ DON'T: Direct Supabase calls in components
import { supabase } from "@/integrations/supabase/client";

const { data } = await supabase.from("problems").select("*");
```

### Available Services

| Service | Purpose |
|---------|---------|
| `ProblemService` | Problems, categories, stars, attempts |
| `UserAttemptsService` | Submissions, drafts, progress |

### Creating New Services

```typescript
// src/services/flashcardService.ts
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";

export class FlashcardService {
  static async getDueCards(userId: string): Promise<FlashcardDeck[]> {
    const { data, error } = await supabase
      .from("flashcard_decks")
      .select("*")
      .eq("user_id", userId)
      .lte("next_review_date", new Date().toISOString());
    
    if (error) {
      logger.error("[FlashcardService] Error fetching due cards", { userId, error });
      throw error;
    }
    
    return data ?? [];
  }
}
```

---

## 🧪 Testing

### Test File Location

```
src/
├── features/
│   └── problems/
│       ├── hooks/
│       │   ├── useProblems.ts
│       │   └── __tests__/
│       │       └── useProblems.test.ts
└── services/
    ├── problemService.ts
    └── __tests__/
        └── problemService.test.ts
```

### Test Structure

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

describe("useProblems", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetching problems", () => {
    it("should return problems for authenticated user", async () => {
      // Arrange
      const mockProblems = [{ id: "1", title: "Two Sum" }];
      vi.mocked(ProblemService.getAll).mockResolvedValue(mockProblems);

      // Act
      const { result } = renderHook(() => useProblems("user-123"));

      // Assert
      await waitFor(() => {
        expect(result.current.problems).toEqual(mockProblems);
      });
    });

    it("should handle errors gracefully", async () => {
      // ...
    });
  });
});
```

### What to Test

| Type | Coverage Target |
|------|-----------------|
| Services | 90%+ (all methods) |
| Hooks | 80%+ (main paths + edge cases) |
| Utils | 100% (pure functions) |
| Components | 60%+ (user interactions) |

### Mocking Patterns

```typescript
// Mocking Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mocking services
vi.mock("@/services/problemService", () => ({
  ProblemService: {
    getAll: vi.fn(),
    getById: vi.fn(),
  },
}));

// Mocking logger (to prevent console noise)
vi.mock("@/utils/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));
```

### Running Tests

```bash
# Run all tests
npm test

# Run in watch mode
npm test -- --watch

# Run specific file
npm test -- --run src/services/__tests__/problemService.test.ts

# Run with coverage
npm test -- --coverage
```

---

## 📊 Analytics

### PostHog Integration

Track all meaningful user interactions:

```typescript
import { analytics } from "@/services/analytics";

// Track events
analytics.track("problem_started", {
  problemId: "two-sum",
  difficulty: "Easy",
  source: "problem_list",
});

analytics.track("solution_submitted", {
  problemId: "two-sum",
  passed: true,
  timeSpent: 120, // seconds
});

analytics.track("flashcard_reviewed", {
  deckId: "deck-123",
  rating: 3,
  timeSpent: 45,
});
```

### When to Add Analytics

✅ **MUST track:**
- Feature usage (starting a problem, completing a review)
- Conversion events (signup, subscription, upgrade)
- Errors that affect user experience
- Performance metrics (load times, API latency)

⚠️ **SHOULD track:**
- Navigation patterns
- Feature engagement (time spent, interactions)
- A/B test variants

❌ **DON'T track:**
- Every click or scroll
- Sensitive user data
- Debug/development events

### Event Naming Convention

```
{noun}_{past_tense_verb}

Examples:
- problem_started
- solution_submitted
- flashcard_reviewed
- subscription_purchased
- coaching_session_completed
```

### Adding Analytics to New Features

```typescript
// In your component or hook
import { analytics } from "@/services/analytics";

const handleComplete = () => {
  // 1. Perform the action
  await submitSolution(code);
  
  // 2. Track the event
  analytics.track("solution_submitted", {
    problemId,
    difficulty: problem.difficulty,
    passed: result.passed,
    timeSpent: Math.round((Date.now() - startTime) / 1000),
  });
  
  // 3. Show feedback
  notifications.success("Solution submitted!");
};
```

---

## 🧰 Available Utilities

### UI Utilities (`@/utils/uiUtils`)

```typescript
import { getDifficultyColor, getErrorMessage, formatRelativeTime } from "@/utils/uiUtils";

// Difficulty badge colors
const colorClass = getDifficultyColor("Hard"); // "bg-red-500/10 text-red-500"

// Error message extraction
const message = getErrorMessage(error, "Default message");

// Relative time formatting
const timeAgo = formatRelativeTime(new Date()); // "just now"
```

### Code Utilities (`@/utils/code`)

```typescript
import { normalizeCode, formatCode, extractFunctionName } from "@/utils/code";

const normalized = normalizeCode(userCode); // Removes whitespace, comments
```

### Logger (`@/utils/logger`)

```typescript
import { logger } from "@/utils/logger";

logger.debug("[Component] Message", { data });
logger.info("[Component] Message", { data });
logger.warn("[Component] Message", { data });
logger.error("[Component] Message", error, { data });
```

### Notifications (`@/shared/services/notificationService`)

```typescript
import { notifications } from "@/shared/services/notificationService";

notifications.success("Action completed!");
notifications.error("Something went wrong");
notifications.info("Helpful information");
notifications.loading("Processing...");

// Domain-specific
notifications.codeSaved();
notifications.testsPassed();
notifications.apiError("save the problem");
```

---

## 🎨 Component Guidelines

### Component Template

```typescript
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { logger } from "@/utils/logger";
import { notifications } from "@/shared/services/notificationService";
import { getErrorMessage } from "@/utils/uiUtils";
import type { MyComponentProps } from "./types";

/**
 * Brief description of what this component does.
 */
export const MyComponent = ({ prop1, prop2, onComplete }: MyComponentProps) => {
  const [loading, setLoading] = useState(false);

  const handleAction = async () => {
    setLoading(true);
    try {
      await someAction();
      logger.info("[MyComponent] Action completed", { prop1 });
      notifications.success("Done!");
      onComplete();
    } catch (err) {
      logger.error("[MyComponent] Action failed", err);
      notifications.error(getErrorMessage(err, "Action failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Button onClick={handleAction} disabled={loading}>
        {loading ? "Processing..." : "Do Action"}
      </Button>
    </div>
  );
};
```

### Splitting Large Components

When a component exceeds 400 lines, split it:

```typescript
// Before: MonolithicComponent.tsx (800 lines)

// After:
// MonolithicComponent.tsx (200 lines) - orchestrator
// components/Header.tsx (100 lines)
// components/Content.tsx (200 lines)
// components/Footer.tsx (100 lines)
// hooks/useComponentLogic.ts (150 lines)
// types.ts (50 lines)
```

---

## ⚡ Performance

### Memoization

```typescript
// ✅ DO: Memoize expensive computations
const sortedProblems = useMemo(
  () => problems.sort((a, b) => a.title.localeCompare(b.title)),
  [problems]
);

// ✅ DO: Memoize callbacks passed to child components
const handleSelect = useCallback(
  (id: string) => onSelect(id),
  [onSelect]
);

// ❌ DON'T: Memoize everything
const simpleValue = useMemo(() => props.count + 1, [props.count]); // Overkill
```

### Lazy Loading

```typescript
// ✅ DO: Lazy load large components
const AdminDashboard = lazy(() => import("@/features/admin/AdminDashboard"));

// Use with Suspense
<Suspense fallback={<LoadingSpinner />}>
  <AdminDashboard />
</Suspense>
```

---

## 🔒 Security

### Never Trust Client Input

```typescript
// ✅ DO: Validate and sanitize on the server
// ✅ DO: Use parameterized queries (Supabase handles this)

// ❌ DON'T: Trust user input for sensitive operations
// ❌ DON'T: Store sensitive data in localStorage
// ❌ DON'T: Expose API keys in client code
```

### Authentication

```typescript
// Always check auth status before sensitive operations
const { user, isAuthenticated } = useAuth();

if (!isAuthenticated) {
  return <LoginPrompt />;
}
```

---

## ✅ Checklist for New Features

Before submitting code for a new feature, verify:

- [ ] **Types**: All functions have explicit types, no `any`
- [ ] **Error Handling**: Uses `getErrorMessage()`, shows user feedback
- [ ] **Logging**: Uses `logger` utility, not `console`
- [ ] **Tests**: Unit tests for hooks/services, minimum 80% coverage
- [ ] **Analytics**: Key events tracked with PostHog
- [ ] **Component Size**: No file exceeds 400 lines
- [ ] **Service Layer**: Database access through services, not direct Supabase
- [ ] **Notifications**: Uses `notifications` service for user feedback
- [ ] **Accessibility**: Proper aria labels, keyboard navigation
- [ ] **Performance**: Memoized where needed, lazy loaded if large
- [ ] **Documentation**: JSDoc comments for public functions

---

## 📚 Related Documentation

- [REFACTORING_GUIDE.md](./REFACTORING_GUIDE.md) - Codebase improvement plan
- [TYPE_SAFETY_IMPLEMENTATION_PLAN.md](./TYPE_SAFETY_IMPLEMENTATION_PLAN.md) - TypeScript guidelines
- [tests/README.md](../tests/README.md) - Testing documentation

---

**Remember: Good code is code that others (including future you) can understand and maintain.** 🚀
