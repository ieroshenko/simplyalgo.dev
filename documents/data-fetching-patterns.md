# Data Fetching Patterns in SimplyAlgo

This document explains the different patterns used for database communication in the codebase and when to use each.

## Overview

The codebase uses **two main patterns** for data fetching:

1. **Custom Hooks with useState/useEffect** (used in: `useBehavioralQuestions`, `useUserStories`, `useProblems`)
2. **React Query (TanStack Query)** (used in: `useFlashcards`)

Both patterns encapsulate database logic in reusable hooks, but they differ in their approach to caching, refetching, and state management.

---

## Pattern 1: Custom Hooks with useState/useEffect

### How It Works

```typescript
// Example: useBehavioralQuestions.ts
export const useBehavioralQuestions = (filters?: {...}) => {
  const [questions, setQuestions] = useState<BehavioralQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("behavioral_questions")
          .select("*");
        
        if (error) throw error;
        setQuestions(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [filters]); // Re-fetch when filters change

  return { questions, loading, error };
};
```

### Characteristics

**State Management:**
- Uses React's built-in `useState` for local component state
- Each hook instance manages its own state independently
- No automatic caching between components

**Data Fetching:**
- `useEffect` triggers fetch on mount and when dependencies change
- Manual loading/error state management
- Manual refetching (via `useCallback` functions)

**Usage in Components:**
```typescript
const MyComponent = () => {
  const { questions, loading, error } = useBehavioralQuestions({ 
    category: 'technical_leadership' 
  });

  if (loading) return <Spinner />;
  if (error) return <Error message={error} />;
  return <QuestionList questions={questions} />;
};
```

### Pros ✅

1. **Simple & Lightweight**: No external dependencies beyond React
2. **Full Control**: You control exactly when and how data is fetched
3. **Easy to Understand**: Straightforward React patterns
4. **Type Safety**: Direct TypeScript integration with Supabase types
5. **Flexible**: Easy to add custom logic (transformations, side effects)

### Cons ❌

1. **No Automatic Caching**: Each component instance fetches independently
2. **Manual Refetching**: You must manually implement refetch logic
3. **No Background Updates**: No automatic stale-while-revalidate
4. **Potential Duplicate Requests**: Multiple components = multiple requests
5. **More Boilerplate**: You write loading/error handling each time

### When to Use

- ✅ Simple CRUD operations
- ✅ Data that doesn't need to be shared across many components
- ✅ When you want explicit control over fetch timing
- ✅ MVP/prototype features (faster to implement)
- ✅ When React Query feels like overkill

---

## Pattern 2: React Query (TanStack Query)

### How It Works

```typescript
// Example: useFlashcards.ts
export const useFlashcards = (userId?: string) => {
  const queryClient = useQueryClient();

  const { data: flashcards = [], isLoading, error } = useQuery({
    queryKey: ["flashcards", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flashcard_decks")
        .select("*")
        .eq("user_id", userId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId, // Only fetch if userId exists
  });

  return { flashcards, isLoading, error };
};
```

### Characteristics

**State Management:**
- React Query manages global cache state
- Shared cache across all components using the same `queryKey`
- Automatic cache invalidation and updates

**Data Fetching:**
- Automatic caching with configurable stale time
- Background refetching when data is stale
- Request deduplication (multiple components = one request)
- Automatic retry on failure

**Usage in Components:**
```typescript
const MyComponent = () => {
  const { flashcards, isLoading, error } = useFlashcards(userId);

  if (isLoading) return <Spinner />;
  if (error) return <Error message={error.message} />;
  return <FlashcardList cards={flashcards} />;
};
```

### Pros ✅

1. **Automatic Caching**: Data cached and shared across components
2. **Request Deduplication**: Multiple components = one network request
3. **Background Refetching**: Automatically keeps data fresh
4. **Optimistic Updates**: Easy to implement optimistic UI
5. **Built-in Retry Logic**: Automatic retries on failure
6. **Cache Invalidation**: Easy to invalidate and refetch
7. **DevTools**: Excellent debugging tools

### Cons ❌

1. **Additional Dependency**: Requires React Query library
2. **Learning Curve**: More concepts to understand (queryKeys, staleTime, etc.)
3. **Overkill for Simple Cases**: Can be too much for basic CRUD
4. **Bundle Size**: Adds ~13KB to bundle (gzipped)

### When to Use

- ✅ Data shared across multiple components
- ✅ Complex data relationships that need synchronization
- ✅ Real-time or frequently updating data
- ✅ When you need optimistic updates
- ✅ Production features with performance requirements

---

## Comparison: Same Feature, Different Patterns

### Example: Fetching User Stories

**Custom Hook Approach:**
```typescript
// useUserStories.ts
export const useUserStories = () => {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchStories().then(setStories);
  }, []);

  const createStory = async (story) => {
    await supabase.from("user_stories").insert(story);
    await fetchStories(); // Manual refetch
  };

  return { stories, loading, createStory };
};
```

**React Query Approach:**
```typescript
// useUserStories.ts (React Query version)
export const useUserStories = () => {
  const queryClient = useQueryClient();

  const { data: stories = [], isLoading } = useQuery({
    queryKey: ["user-stories"],
    queryFn: () => fetchStories(),
  });

  const createStoryMutation = useMutation({
    mutationFn: (story) => supabase.from("user_stories").insert(story),
    onSuccess: () => {
      queryClient.invalidateQueries(["user-stories"]); // Auto refetch
    },
  });

  return { stories, isLoading, createStory: createStoryMutation.mutate };
};
```

---

## Hybrid Approach: When to Mix Patterns

Your codebase currently uses **both patterns**, which is actually a good strategy:

### Use Custom Hooks For:
- **Behavioral Interview features** (new, MVP phase)
- **Simple CRUD operations** (stories, questions)
- **One-off data fetches** (user stats)

### Use React Query For:
- **Flashcards** (complex, needs caching across components)
- **Shared data** (user profile, subscription status)
- **Real-time features** (if you add live updates)

---

## Migration Path: Custom Hook → React Query

If you want to migrate a custom hook to React Query:

### Before (Custom Hook):
```typescript
export const useBehavioralQuestions = (filters) => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuestions(filters).then(setQuestions);
  }, [filters]);

  return { questions, loading };
};
```

### After (React Query):
```typescript
export const useBehavioralQuestions = (filters) => {
  const { data: questions = [], isLoading: loading } = useQuery({
    queryKey: ["behavioral-questions", filters],
    queryFn: () => fetchQuestions(filters),
  });

  return { questions, loading };
};
```

**Benefits of Migration:**
- Automatic caching (if same filters, uses cache)
- Request deduplication (multiple components share one request)
- Background refetching (keeps data fresh)

---

## Best Practices

### For Custom Hooks:

1. **Always handle loading/error states**
   ```typescript
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
   ```

2. **Use useCallback for refetch functions**
   ```typescript
   const fetchStories = useCallback(async () => {
     // ... fetch logic
   }, [dependencies]);
   ```

3. **Transform data in the hook, not the component**
   ```typescript
   // ✅ Good: Transform in hook
   const transformedQuestions = data.map(q => ({ ... }));
   
   // ❌ Bad: Transform in component
   const { questions } = useBehavioralQuestions();
   const transformed = questions.map(...);
   ```

4. **Return refetch functions for manual updates**
   ```typescript
   return { stories, loading, error, refetch: fetchStories };
   ```

### For React Query:

1. **Use descriptive queryKeys**
   ```typescript
   queryKey: ["user-stories", userId, filters]
   ```

2. **Set appropriate staleTime**
   ```typescript
   staleTime: 5 * 60 * 1000, // 5 minutes
   ```

3. **Use enabled for conditional fetching**
   ```typescript
   enabled: !!userId, // Only fetch if userId exists
   ```

4. **Invalidate on mutations**
   ```typescript
   onSuccess: () => {
     queryClient.invalidateQueries(["user-stories"]);
   }
   ```

---

## Performance Considerations

### Custom Hooks:
- **Multiple Components**: Each fetches independently → N requests
- **No Caching**: Same data fetched multiple times
- **Manual Optimization**: You must implement deduplication yourself

### React Query:
- **Multiple Components**: Shared cache → 1 request
- **Automatic Caching**: Data reused across components
- **Smart Refetching**: Only refetches when data is stale

**Example Scenario:**
```typescript
// Component A
const { questions } = useBehavioralQuestions();

// Component B (same page)
const { questions } = useBehavioralQuestions();

// Custom Hook: 2 network requests
// React Query: 1 network request (shared cache)
```

---

## Recommendation for Behavioral Interview Feature

For the **MVP**, custom hooks are perfect because:
1. ✅ Faster to implement
2. ✅ Simpler mental model
3. ✅ No additional dependencies
4. ✅ Easy to understand and maintain

**Consider migrating to React Query later if:**
- You add real-time updates
- Multiple components need the same data
- You need optimistic updates
- Performance becomes an issue

---

## Summary

| Feature | Custom Hooks | React Query |
|---------|--------------|-------------|
| **Complexity** | Low | Medium |
| **Caching** | Manual | Automatic |
| **Deduplication** | Manual | Automatic |
| **Bundle Size** | 0KB | ~13KB |
| **Learning Curve** | Low | Medium |
| **Best For** | Simple CRUD, MVP | Complex apps, shared data |

Both patterns are valid! Choose based on your needs:
- **Start simple** → Custom hooks
- **Scale up** → React Query when needed

