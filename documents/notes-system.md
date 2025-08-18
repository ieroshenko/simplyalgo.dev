# Notes System Architecture

## Overview
The Notes component provides a local-first, high-performance note-taking system for each coding problem. It implements optimistic updates with intelligent caching to deliver instant responsiveness while maintaining data consistency across devices.

## Core Components

### File Location
- **Component**: `src/components/Notes.tsx`
- **Types**: `src/types/supabase-common.ts` (NotesData interface)
- **Database**: Supabase `notes` table

## Architecture Pattern: Local-First with Background Sync

### Data Flow
```
User Input → Local Cache → UI Update → Debounced Server Save
     ↓              ↓              ↓              ↓
Instant UX    Persistence    Live Feedback    Data Sync
```

## Core Mechanisms

### 1. Cache Management
- **Storage**: Browser localStorage with user/problem-specific keys
- **Key Format**: `notes_{userId}_{problemId}`
- **Structure**:
  ```typescript
  interface CachedNotes {
    content: string;        // Note text
    lastSaved: string;      // ISO timestamp
    timestamp: number;      // Cache creation time
    version: number;        // Conflict resolution
  }
  ```

### 2. Loading Strategy
1. **Instant Load**: Check localStorage first (1ms response)
2. **Smart Sync**: Only fetch from server if:
   - No cache exists
   - Cache is older than 5 minutes
   - Cache version is corrupted (version = 0)
3. **Background Update**: Sync happens behind the scenes

### 3. Saving Strategy
- **Optimistic Updates**: Every keystroke updates localStorage immediately
- **Debounced Sync**: Server saves triggered after 2 seconds of inactivity
- **Conflict Resolution**: Compares timestamps to handle concurrent edits
- **Error Recovery**: Reverts to cached state if server save fails

## Performance Characteristics

### Load Times
- **With Cache**: ~1ms (instant)
- **Without Cache**: ~200-500ms (network dependent)
- **Tab Switching**: Instant (no re-fetch needed)

### Sync Behavior
- **Fresh Cache**: No server request
- **Stale Cache**: Background sync with timestamp comparison
- **Offline Mode**: Full functionality with localStorage only

## User Experience Features

### Visual States
- **Loading**: Only shown when no cache exists
- **Saving**: Animated indicator during server sync
- **Saved**: Green checkmark with timestamp
- **Syncing**: Additional "Syncing..." indicator for background updates
- **Unsaved**: Yellow warning for local changes

### Persistence
- **Cross-Tab**: Changes persist across browser tabs
- **Crash Recovery**: Work survives browser crashes
- **Offline Resilience**: Full editing capability without network

## Technical Implementation

### Key Functions
- `loadFromCache()`: Retrieves cached notes instantly
- `saveToCache()`: Updates localStorage with optimistic data
- `loadNotes()`: Orchestrates cache-first loading with background sync
- `saveNotes()`: Handles server persistence with error recovery
- `debouncedSave()`: Prevents excessive server requests

### State Management
- `content`: Current note text (reactive to user input)
- `isLoading`: Only true when no cache exists
- `isSaving`: Server save in progress
- `isBackgroundSync`: Silent sync happening
- `hasUnsavedChanges`: Local changes not yet saved to server

## Database Schema

### Supabase Table: `notes`
```sql
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  problem_id STRING NOT NULL,
  content TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, problem_id)
);
```

### RLS Policies
- Users can only access their own notes
- Automatic timestamps on insert/update

## Error Handling

### Network Failures
- **With Cache**: Continue with cached data, show warning
- **Without Cache**: Display error message, allow retry
- **Save Failures**: Revert optimistic updates, preserve user work

### Data Corruption
- **Invalid Cache**: Fallback to server fetch
- **Parse Errors**: Clear corrupted cache, start fresh
- **Conflict Resolution**: Server timestamp wins

## Integration Points

### Parent Component
- **ProblemSolver**: Passes `problemId` and holds ref for manual refresh
- **Ref Interface**: Exposes `loadNotes()` for external triggering

### Dependencies
- **Authentication**: Uses `useAuth()` for user context
- **UI Feedback**: Integrates with toast notifications
- **Storage**: Browser localStorage for caching
- **Persistence**: Supabase for cross-device sync

## Future Enhancements

### Potential Improvements
- **Real-time Sync**: WebSocket updates for multi-device collaboration
- **Rich Text**: Markdown preview and editing features
- **Version History**: Track note revisions over time
- **Search**: Full-text search across all user notes
- **Attachments**: Support for images and files

### Scalability Considerations
- **Cache Size**: Monitor localStorage usage
- **Sync Frequency**: Adaptive sync based on activity
- **Conflict Resolution**: More sophisticated merge strategies