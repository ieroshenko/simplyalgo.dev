# 📋 Coding Patterns Guide

> **Quick Reference**: How to write code in this codebase

This guide shows you **EXACTLY** what to use for common coding tasks. Follow these patterns to keep the codebase consistent and maintainable.

---

## 🎯 Quick Decision Tree

```
Need to do async operation? → Use useAsyncOperation
Need to manage async state? → Use useAsyncState
Need to show notification? → Use notifications service
Need to query database? → Use query builders
Need to add new feature? → Follow patterns below
```

---

## 📊 State Management

### ✅ DO: Use `useAsyncState` for Simple Async State

**When**: You need data, loading, and error state for async operations

**Pattern**:
```typescript
import { useAsyncState } from '@/shared/hooks/useAsyncState';

const { data, loading, error, setData, setLoading, setError, reset } =
  useAsyncState<User[]>();

// Manual control
const fetchUsers = async () => {
  setLoading(true);
  try {
    const users = await userService.getAll();
    setData(users);
  } catch (err) {
    setError(err instanceof Error ? err : new Error(String(err)));
  }
};
```

**Location**: `src/shared/hooks/useAsyncState.ts`

---

### ✅ DO: Use `useAsyncOperation` for Async Operations with Error Handling

**When**: You need automatic error handling, loading states, and notifications

**Pattern**:
```typescript
import { useAsyncOperation } from '@/shared/hooks/useAsyncOperation';

const { data, loading, error, execute } = useAsyncOperation<User[]>();

// Automatic error handling + notifications
const loadUsers = async () => {
  await execute(
    userService.getAll,
    {
      successMessage: 'Users loaded successfully',
      errorMessage: 'Failed to load users',
      onSuccess: (users) => {
        // Optional callback after success
        console.log(`Loaded ${users.length} users`);
      }
    }
  );
};

// With parameters
const createUser = async (name: string, email: string) => {
  await execute(
    userService.create,
    name,
    email,
    {
      successMessage: 'User created!',
      onSuccess: (user) => navigate(`/users/${user.id}`)
    }
  );
};
```

**Location**: `src/shared/hooks/useAsyncOperation.ts`

**Why**: Consistent error handling, automatic loading states, built-in notifications

---

### ❌ DON'T: Create Custom State Management for Async

```typescript
// ❌ BAD - Duplicate async state pattern
const [data, setData] = useState(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

const fetchData = async () => {
  setLoading(true);
  try {
    const result = await api.get('/data');
    setData(result);
  } catch (err) {
    setError(err);
    toast.error('Failed');
  } finally {
    setLoading(false);
  }
};

// ✅ GOOD - Use useAsyncOperation
const { data, loading, error, execute } = useAsyncOperation();

const fetchData = async () => {
  await execute(
    () => api.get('/data'),
    { successMessage: 'Loaded!', errorMessage: 'Failed' }
  );
};
```

---

## 🔔 Notifications

### ✅ DO: Use `notifications` Service for All Toasts

**Pattern**:
```typescript
import { notifications } from '@/shared/services/notificationService';

// Success notification
notifications.success('Data saved successfully');

// Error notification
notifications.error('Failed to save data');
notifications.error(error); // Handles Error objects

// Info notification
notifications.info('Processing will take a few minutes');

// Warning notification
notifications.warning('This action cannot be undone');

// Loading notification (dismissible)
const loadingId = notifications.loading('Uploading file...');
// Later: toast.dismiss(loadingId);

// Promise-based notification (auto-handles loading/success/error)
await notifications.promise(
  uploadFile(),
  {
    loading: 'Uploading...',
    success: 'File uploaded!',
    error: 'Upload failed'
  }
);

// Custom duration
notifications.success('Saved!', { duration: 2000 });
```

**Location**: `src/shared/services/notificationService.ts`

**Default Durations**:
- Success: 4 seconds
- Error: 6 seconds
- Info: 4 seconds
- Warning: 5 seconds
- Loading: Infinity (manual dismiss)

---

### ❌ DON'T: Use Toast Directly

```typescript
// ❌ BAD - Direct toast usage
import { toast } from 'sonner';
toast.success('Saved');
toast.error('Failed', { duration: 5000 });

// ✅ GOOD - Use notifications service
import { notifications } from '@/shared/services/notificationService';
notifications.success('Saved');
notifications.error('Failed', { duration: 5000 });
```

**Why**: Centralized control, consistent durations, easier to mock in tests

---

## 🗄️ Database Queries

### ✅ DO: Use Query Builders for Supabase

**Pattern**:
```typescript
import { problemQueries } from '@/shared/queries/problemQueries';

// Get all problems
const { data, error } = await problemQueries.getAll();

// Get by ID
const { data } = await problemQueries.getById('two-sum');

// Get by difficulty
const { data } = await problemQueries.getByDifficulty('Easy');

// Get by category
const { data } = await problemQueries.getByCategory('Arrays');

// Search
const { data } = await problemQueries.searchByTitle('two');

// Chain with additional filters
const { data } = await problemQueries
  .getByDifficulty('Easy')
  .limit(10);
```

**Location**: `src/shared/queries/problemQueries.ts`

---

### ❌ DON'T: Write Raw Supabase Queries Everywhere

```typescript
// ❌ BAD - Raw query scattered everywhere
const { data } = await supabase
  .from('problems')
  .select('*')
  .eq('difficulty', 'Easy')
  .order('created_at', { ascending: false });

// ✅ GOOD - Use query builder
const { data } = await problemQueries.getByDifficulty('Easy');
```

**Why**: DRY principle, easier to test, single source of truth for queries

---

## 🎨 Component Patterns

### ✅ DO: Keep Components Under 300 Lines

**Pattern**:
```typescript
// Break large components into smaller ones
const UserProfile = () => (
  <>
    <UserHeader />
    <UserStats />
    <UserActivity />
    <UserSettings />
  </>
);
```

**File Size Guidelines**:
- ✅ 0-150 lines: Perfect
- ✅ 150-300 lines: Good
- 🟡 300-500 lines: Consider splitting
- 🔴 500+ lines: Must split

---

### ✅ DO: Extract Repeated Logic into Custom Hooks

**When**: Logic is used 3+ times

**Pattern**:
```typescript
// ❌ BAD - Repeated in multiple components
const [user, setUser] = useState(null);
useEffect(() => {
  const { data } = await supabase.auth.getUser();
  setUser(data.user);
}, []);

// ✅ GOOD - Extract to custom hook
const useCurrentUser = () => {
  const [user, setUser] = useState(null);
  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    fetchUser();
  }, []);
  return user;
};

// Usage
const user = useCurrentUser();
```

**Rule of Three**: Extract after **3rd repetition**, not before

---

## 🔄 Data Fetching

### ✅ DO: Combine useAsyncOperation with Query Builders

**Pattern**:
```typescript
import { useAsyncOperation } from '@/shared/hooks/useAsyncOperation';
import { problemQueries } from '@/shared/queries/problemQueries';

const ProblemsPage = () => {
  const { data: problems, loading, error, execute } = useAsyncOperation<Problem[]>();

  useEffect(() => {
    execute(
      async () => {
        const { data, error } = await problemQueries.getAll();
        if (error) throw error;
        return data;
      },
      {
        errorMessage: 'Failed to load problems'
      }
    );
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!problems) return null;

  return <ProblemList problems={problems} />;
};
```

---

### ✅ DO: Use Optimistic Updates for Better UX

**Pattern**:
```typescript
const { data, setData, execute } = useAsyncOperation<Todo[]>();

const addTodo = async (text: string) => {
  // Optimistic update
  const tempTodo = { id: 'temp', text, completed: false };
  setData([...(data || []), tempTodo]);

  // Actual API call
  await execute(
    async () => {
      const { data: newTodo } = await todoQueries.create(text);
      return [...(data || []), newTodo];
    },
    {
      successMessage: 'Todo added!',
      onError: () => {
        // Revert on error
        setData(data);
      }
    }
  );
};
```

---

## 🧪 Testing Patterns

### ✅ DO: Write Tests for Business Logic

**What to Test**:
- ✅ Business logic
- ✅ Edge cases
- ✅ Error handling
- ✅ User interactions

**What NOT to Test**:
- ❌ Implementation details
- ❌ Third-party libraries
- ❌ Mocks themselves

**Pattern**:
```typescript
describe('useAsyncOperation', () => {
  it('should handle success with notification', async () => {
    const { result } = renderHook(() => useAsyncOperation());

    await act(async () => {
      await result.current.execute(
        () => Promise.resolve('data'),
        { successMessage: 'Success!' }
      );
    });

    expect(result.current.data).toBe('data');
    expect(toast.success).toHaveBeenCalledWith('Success!');
  });
});
```

---

## 📁 File Organization

### ✅ DO: Use Feature-Based Structure for New Features

**Pattern**:
```
src/
  features/
    flashcards/
      components/
        FlashcardReviewInterface.tsx
        FlashcardCard.tsx
      hooks/
        useFlashcards.ts
        useFlashcardProgress.ts
      services/
        flashcardService.ts
      __tests__/
        flashcards.test.ts
    coaching/
      components/
      hooks/
      services/
```

**Benefits**: Related code stays together, easier to find, easier to test

---

## 🚨 Error Handling

### ✅ DO: Use Try-Catch with useAsyncOperation

**Pattern**:
```typescript
const { execute } = useAsyncOperation();

const handleSubmit = async (data: FormData) => {
  await execute(
    async () => {
      // Validate
      if (!data.email) throw new Error('Email is required');

      // Submit
      const result = await submitForm(data);
      return result;
    },
    {
      successMessage: 'Form submitted!',
      errorMessage: 'Submission failed',
      onSuccess: () => navigate('/success'),
      onError: (err) => {
        // Custom error handling
        if (err.message.includes('email')) {
          setEmailError(err.message);
        }
      }
    }
  );
};
```

---

### ✅ DO: Convert Unknown Errors to Error Objects

**Pattern**:
```typescript
try {
  await operation();
} catch (err) {
  const error = err instanceof Error ? err : new Error(String(err));
  notifications.error(error);
}
```

---

## 🎯 Performance

### ✅ DO: Memoize Expensive Computations

**Pattern**:
```typescript
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

const handleClick = useCallback(() => {
  doSomething();
}, []);
```

**When**: Computation is expensive OR callback is passed to child components

---

### ❌ DON'T: Memoize Everything

```typescript
// ❌ BAD - Unnecessary memoization
const sum = useMemo(() => a + b, [a, b]);

// ✅ GOOD - Simple calculation, no memoization needed
const sum = a + b;
```

---

## 📝 Code Style

### ✅ DO: Use Descriptive Names

```typescript
// ✅ GOOD
const isValidEmail = (email: string) => /regex/.test(email);
const activateUserAccount = (userId: string) => { /* ... */ };

// ❌ BAD
const check = (e: string) => /regex/.test(e);
const doStuff = (id: string) => { /* ... */ };
```

---

### ✅ DO: Comment the "Why", Not the "What"

```typescript
// ❌ BAD - Obvious
// Set loading to true
setLoading(true);

// ✅ GOOD - Explains business logic
// Delay vim mode init to avoid race condition with Monaco editor mounting
setTimeout(() => loadVimMode(), 500);
```

---

## 🔧 Common Patterns Cheat Sheet

| Task | Pattern | Import From |
|------|---------|-------------|
| Async operation with error handling | `useAsyncOperation` | `@/shared/hooks/useAsyncOperation` |
| Simple async state | `useAsyncState` | `@/shared/hooks/useAsyncState` |
| Show notification | `notifications.success()` | `@/shared/services/notificationService` |
| Query problems | `problemQueries.getAll()` | `@/shared/queries/problemQueries` |
| Handle form submission | `useAsyncOperation` + `execute` | `@/shared/hooks/useAsyncOperation` |
| Loading state | Automatic in `useAsyncOperation` | - |
| Error state | Automatic in `useAsyncOperation` | - |

---

## ✨ Real-World Examples

### Example 1: Fetching and Displaying Data

```typescript
import { useAsyncOperation } from '@/shared/hooks/useAsyncOperation';
import { problemQueries } from '@/shared/queries/problemQueries';

const ProblemsPage = () => {
  const { data, loading, execute } = useAsyncOperation<Problem[]>();

  useEffect(() => {
    execute(
      async () => {
        const { data, error } = await problemQueries.getByDifficulty('Easy');
        if (error) throw error;
        return data;
      },
      { errorMessage: 'Failed to load problems' }
    );
  }, []);

  if (loading) return <Spinner />;
  return <ProblemList problems={data || []} />;
};
```

### Example 2: Form Submission

```typescript
import { useAsyncOperation } from '@/shared/hooks/useAsyncOperation';
import { notifications } from '@/shared/services/notificationService';

const CreateProblemForm = () => {
  const { loading, execute } = useAsyncOperation<Problem>();

  const handleSubmit = async (formData: ProblemInput) => {
    await execute(
      () => problemService.create(formData),
      {
        successMessage: 'Problem created successfully!',
        errorMessage: 'Failed to create problem',
        onSuccess: (problem) => {
          navigate(`/problems/${problem.id}`);
        }
      }
    );
  };

  return <Form onSubmit={handleSubmit} loading={loading} />;
};
```

### Example 3: Optimistic Update

```typescript
const { data: todos, setData, execute } = useAsyncOperation<Todo[]>();

const toggleTodo = async (id: string) => {
  // Optimistic update
  const updated = todos?.map(t =>
    t.id === id ? { ...t, completed: !t.completed } : t
  );
  setData(updated || []);

  // Actual update
  await execute(
    () => todoService.toggle(id),
    {
      onError: () => setData(todos || []) // Revert on error
    }
  );
};
```

---

## 🎓 Learning More

- [Code Principles](./CODE_PRINCIPLES.md) - DRY, KISS, SOLID guidelines
- [Refactoring Guide](./REFACTORING_GUIDE.md) - Comprehensive refactoring plan
- [Testing Guide](../tests/README.md) - Testing strategy and patterns

---

**Remember**: Consistency > Cleverness. Follow these patterns and the codebase stays maintainable! 🚀
