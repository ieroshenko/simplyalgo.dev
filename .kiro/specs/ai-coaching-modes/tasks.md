# Implementation Plan

- [x] 1. Create core types and interfaces for coaching modes
  - Define CoachingMode type and related interfaces in src/types/index.ts
  - Add coaching mode state management types
  - Create request body extensions for mode parameter
  - _Requirements: 1.1, 4.1_

- [x] 2. Implement coaching mode state management hook
  - Create useCoachingMode hook in src/hooks/useCoachingMode.ts
  - Implement local storage persistence for mode preferences
  - Add mode switching logic with fallback handling
  - Write unit tests for the hook functionality
  - _Requirements: 1.1, 5.1, 5.2_

- [x] 3. Create CoachingModeToggle UI component
  - Build toggle component in src/components/coaching/CoachingModeToggle.tsx
  - Implement accessible toggle switch with proper ARIA labels
  - Add tooltips explaining each mode
  - Style component to match existing design system
  - Write unit tests for component interactions
  - _Requirements: 1.2, 1.3, 6.1, 6.2, 6.3_

- [x] 4. Integrate mode toggle into AIChat component
  - Add CoachingModeToggle to chat header in src/components/AIChat.tsx
  - Connect mode state to chat session
  - Ensure visual feedback for active mode
  - Maintain existing chat functionality
  - _Requirements: 1.1, 1.2, 1.4, 6.4_

- [x] 5. Update useChatSession hook for mode support
  - Modify sendMessage function in src/hooks/useChatSession.ts to include coaching mode
  - Pass mode parameter to Edge Function calls
  - Ensure mode context is preserved across requests
  - Maintain existing Judge0 context optimization
  - _Requirements: 4.2, 4.3_

- [x] 6. Implement mode-specific prompt routing in Edge Function
  - Create prompt configuration system in sup2abase/functions/ai-chat/prompts.ts
  - Define Socratic mode prompt with question-focused guidelines
  - Define Comprehensive mode prompt using existing PROMPT_HISTORY.md content
  - Add prompt selection logic based on coaching mode parameter
  - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2_

- [x] 7. Update Edge Function request handling
  - Modify request body interface in supabase/functions/ai-chat/types.ts
  - Add coachingMode parameter handling in supabase/functions/ai-chat/index.ts
  - Integrate prompt routing with existing conversation generation
  - Ensure fallback to comprehensive mode for invalid/missing mode
  - _Requirements: 4.1, 4.2_

- [x] 8. Add error handling and fallback mechanisms
  - Implement mode validation and fallback logic
  - Add error recovery for mode toggle failures
  - Ensure chat continues functioning if mode switching fails
  - Add user feedback for mode-related errors
  - _Requirements: 1.4, 4.3_

- [ ] 9. Write integration tests for mode switching workflow
  - Test end-to-end mode switching in src/components/__tests__/
  - Verify prompt routing works correctly for each mode
  - Test conversation continuity across mode changes
  - Validate local storage persistence
  - _Requirements: 1.1, 1.4, 5.1, 5.2_

- [ ] 10. Update existing tests and add comprehensive test coverage
  - Update AIChat component tests to include mode toggle
  - Add tests for useChatSession mode parameter passing
  - Test Edge Function mode handling
  - Ensure all existing functionality remains intact
  - _Requirements: 1.4, 4.3_