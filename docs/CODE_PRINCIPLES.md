# 🎯 Code Principles - Quick Reference

> **TL;DR**: DRY, KISS, SOLID - but don't overdo it!

---

## 🚦 Quick Decision Guide

### "Should I extract this into a utility?"

```
Is it used 3+ times? → YES, extract
Is it complex (>20 lines)? → MAYBE, consider extracting
Is it simple (1-5 lines)? → NO, keep it inline
Is it used only once? → NO, wait until needed again
```

### "Should I create a new component?"

```
Used in 2+ places? → YES
Single clear responsibility? → YES
Over 200 lines? → YES
Used only once and simple? → NO
Just for organization? → NO
```

### "Should I create a custom hook?"

```
Reusable logic used 3+ times? → YES
Complex state management? → YES
Needs isolated testing? → YES
Simple useState wrapper? → NO
Used only once? → NO
```

### "Should I create a service?"

```
Talks to external API? → YES
Complex business logic? → YES
Needs mocking for tests? → YES
Simple transformation? → NO
One-off operation? → NO
```

---

## ✅ DO's

### **1. Extract After Third Repetition (Rule of Three)**
```typescript
// First time: Write it
const result1 = data.filter(x => x.active).map(x => x.name);

// Second time: Notice it
const result2 = data.filter(x => x.active).map(x => x.name);

// Third time: Extract it
const getActiveNames = (items) => items.filter(x => x.active).map(x => x.name);
const result3 = getActiveNames(data);
```

### **2. Keep Functions Small and Focused**
```typescript
// ✅ Good - one thing
const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const saveUser = async (user: User) => await db.users.save(user);
const notifyUser = (msg: string) => toast.success(msg);

// ❌ Bad - too many responsibilities
const validateAndSaveAndNotifyUser = async (user: User) => {
  // validation + saving + notification = violation
};
```

### **3. Name Things Clearly**
```typescript
// ✅ Good - clear intent
const isValidEmail = (email: string) => /regex/.test(email);
const activateUserAccount = (userId: string) => { /* ... */ };
const formatDateForDisplay = (date: Date) => date.toLocaleDateString();

// ❌ Bad - unclear
const check = (e: string) => /regex/.test(e);
const doStuff = (id: string) => { /* ... */ };
const format = (d: Date) => d.toLocaleDateString();
```

### **4. Use Consistent Patterns**
```typescript
// ✅ Consistent async state management
const { data, loading, error, execute } = useAsyncOperation<User>();

// ✅ Consistent notifications
notifications.success('Saved!');
notifications.error('Failed to save');

// ✅ Consistent service calls
const users = await userService.getAll();
const user = await userService.getById(id);
```

### **5. Comment the "Why", Not the "What"**
```typescript
// ❌ Bad - obvious
// Set loading to true
setLoading(true);

// ✅ Good - explains business logic
// Delay vim mode init to avoid race condition with Monaco editor mounting
setTimeout(() => loadVimMode(), 500);

// ✅ Good - explains decision
// Using debounce instead of throttle because we want the last value, not first
const debouncedSave = debounce(save, 1000);
```

---

## ❌ DON'Ts

### **1. Don't Create Premature Abstractions**
```typescript
// ❌ Bad - over-abstracted before needed
interface IGenericRepositoryFactoryProvider<T> {
  create(): IRepository<T>;
}

// ✅ Good - wait until you have 3+ similar cases
const fetchUsers = async () => await api.get('/users');
// When you have 3 similar fetches, THEN extract
```

### **2. Don't Create God Objects/Components**
```typescript
// ❌ Bad - does everything
const ProblemSolverPage = () => {
  // 1000 lines of code handling:
  // - problem display
  // - code editing
  // - test running
  // - coaching
  // - submissions
  // - analytics
  // - ...
};

// ✅ Good - composed from smaller pieces
const ProblemSolverPage = () => (
  <>
    <ProblemPanel />
    <CodeEditor />
    <TestRunner />
    <CoachingAssistant />
  </>
);
```

### **3. Don't Over-Engineer Simple Things**
```typescript
// ❌ Bad - too complex for simple task
const concatenateStrings = (strings: string[]): string =>
  strings.reduce((accumulator, current, index) =>
    accumulator + (index > 0 ? ' ' : '') + current,
  '');

// ✅ Good - simple and clear
const concatenateStrings = (strings: string[]) => strings.join(' ');
```

### **4. Don't Create Unnecessary Interfaces**
```typescript
// ❌ Bad - only one implementation
interface IUserService {
  getUser(id: string): Promise<User>;
}
class UserService implements IUserService {
  getUser(id: string): Promise<User> { /* ... */ }
}

// ✅ Good - add interface only when needed (2+ implementations)
class UserService {
  getUser(id: string): Promise<User> { /* ... */ }
}
```

### **5. Don't Ignore TypeScript Errors**
```typescript
// ❌ Bad - using any everywhere
const processData = (data: any) => { /* ... */ };

// ❌ Bad - using @ts-ignore without comment
// @ts-ignore
const result = someFunction();

// ✅ Good - proper types
const processData = (data: User[]) => { /* ... */ };

// ✅ Good - @ts-ignore with explanation
// @ts-ignore - third-party library has incorrect types, see issue #123
const result = someFunction();
```

---

## 🔧 Common Patterns

### **Async State Management**
```typescript
// Use this pattern consistently
const { data, loading, error, execute } = useAsyncOperation<User[]>();

useEffect(() => {
  execute(
    () => userService.getAll(),
    {
      successMessage: 'Users loaded',
      errorMessage: 'Failed to load users'
    }
  );
}, []);
```

### **Service Layer**
```typescript
// Always go through services, not direct DB access
// ❌ Bad
const { data } = await supabase.from('users').select('*');

// ✅ Good
const users = await userService.getAll();
```

### **Error Handling**
```typescript
// Consistent error handling
try {
  await operation();
  notifications.success('Operation successful');
} catch (error) {
  logger.error('Operation failed', error);
  notifications.error('Operation failed');
  throw error; // Re-throw if caller needs to handle
}
```

### **Component Structure**
```typescript
// Consistent component organization
const MyComponent = ({ prop1, prop2 }: Props) => {
  // 1. Hooks (order: useState, useRef, useEffect, custom hooks)
  const [state, setState] = useState();
  const ref = useRef();
  const { data, loading } = useCustomHook();

  // 2. Event handlers
  const handleClick = () => { /* ... */ };

  // 3. Computed values
  const displayText = useMemo(() => /* ... */, []);

  // 4. Effects
  useEffect(() => { /* ... */ }, []);

  // 5. Render
  return <div>...</div>;
};
```

---

## 📏 File Size Guidelines

```
0-150 lines   → ✅ Perfect
150-300 lines → ✅ Good
300-500 lines → 🟡 Consider splitting
500-800 lines → 🟠 Should split
800+ lines    → 🔴 Must split
```

### When a file hits 300+ lines, ask:
1. Can I extract components?
2. Can I extract hooks?
3. Can I extract utilities?
4. Does it have a single responsibility?

---

## 🧪 Testing Principles

### **What to Test**
✅ Business logic
✅ Edge cases
✅ Error handling
✅ User interactions
✅ State changes

### **What NOT to Test**
❌ Implementation details
❌ Third-party libraries
❌ CSS/styling
❌ Mocks themselves

### **Test Structure**
```typescript
describe('Feature', () => {
  // Setup
  beforeEach(() => { /* ... */ });

  // Happy path
  it('should work in normal case', () => { /* ... */ });

  // Edge cases
  it('should handle empty input', () => { /* ... */ });
  it('should handle invalid input', () => { /* ... */ });

  // Error cases
  it('should handle API errors', () => { /* ... */ });
});
```

---

## 🎨 Code Review Checklist

Before submitting PR, check:

- [ ] No files over 500 lines
- [ ] No duplicate code (follow DRY)
- [ ] Functions are small (<50 lines)
- [ ] Clear function/variable names
- [ ] Types are explicit (no `any`)
- [ ] Error handling is consistent
- [ ] Tests are included
- [ ] No console.logs (use logger)
- [ ] No commented-out code
- [ ] Follows existing patterns

---

## 🚀 Performance Tips

### **React Performance**
```typescript
// ✅ Memoize expensive computations
const expensiveValue = useMemo(() =>
  complexCalculation(data),
  [data]
);

// ✅ Memoize callbacks passed to children
const handleClick = useCallback(() => {
  doSomething();
}, []);

// ✅ Split large lists with virtualization
import { VirtualList } from '@/components/VirtualList';

// ❌ Don't memoize everything
const simpleValue = useMemo(() => a + b, [a, b]); // Overkill!
```

### **Bundle Size**
```typescript
// ✅ Lazy load routes
const Dashboard = lazy(() => import('./pages/Dashboard'));

// ✅ Import only what you need
import { Button } from '@/components/ui/button';

// ❌ Don't import entire libraries
import _ from 'lodash'; // Imports everything!
import { debounce } from 'lodash'; // Better, but still large
import debounce from 'lodash/debounce'; // Best!
```

---

## 📚 Quick Links

- [Full Refactoring Guide](./REFACTORING_GUIDE.md)
- [Type Safety Plan](./TYPE_SAFETY_IMPLEMENTATION_PLAN.md)
- [Testing Guide](../tests/README.md)

---

**Remember**:
- **Pragmatic > Perfect**
- **Simple > Clever**
- **Working > Ideal**
- **Readable > Compact**

_"Any fool can write code that a computer can understand. Good programmers write code that humans can understand."_ - Martin Fowler
