# Behavioral Interview Prep Feature Design

## Overview

A comprehensive technical behavioral interview preparation system focused on engineering-specific scenarios. Helps users master the STAR method, practice technical behavioral questions (debugging, code reviews, system design decisions, technical leadership), build a personal story library of technical experiences, and receive AI-powered feedback. This feature complements the existing technical interview prep (coding problems, system design) by covering the behavioral/cultural fit aspect of engineering interviews with a technical focus.

## Core Philosophy

- **STAR Method First**: All answers structured using Situation, Task, Action, Result framework
- **Story-Driven**: Users build a library of personal experiences that can be adapted to different questions
- **AI-Powered Practice**: Simulated interview sessions with real-time feedback
- **Company-Specific Prep**: Tailor practice to specific companies' interview styles
- **Progress Tracking**: Monitor improvement across different question categories

---

## Feature Components

### 1. Question Bank System

**Purpose**: Curated library of behavioral interview questions organized by category

**Categories**:
- **Technical Leadership** (e.g., "Tell me about a time you led a technical project or mentored junior engineers")
- **Code Review & Collaboration** (e.g., "Describe a time you disagreed with a code review or design decision")
- **Debugging & Problem Solving** (e.g., "Tell me about the most challenging bug you've debugged")
- **System Design & Architecture** (e.g., "Describe a time you had to refactor a system or improve its architecture")
- **Technical Failure & Recovery** (e.g., "Tell me about a time you introduced a bug to production or made a technical mistake")
- **Technical Debt & Prioritization** (e.g., "How do you balance shipping features quickly vs. writing maintainable code?")
- **Technical Communication** (e.g., "Tell me about explaining a complex technical concept to a non-technical stakeholder")
- **Technical Initiative** (e.g., "Describe a time you identified and fixed a performance issue or improved system efficiency")
- **Learning New Technologies** (e.g., "Tell me about a time you had to quickly learn a new technology or framework")
- **Code Quality & Best Practices** (e.g., "Describe a time you had to convince your team to adopt a new tool or practice")
- **Scaling & Performance** (e.g., "Tell me about a time you optimized a system that was too slow")
- **Company-Specific** (e.g., "Why do you want to work at Google?" or "How do you align with [Company]'s engineering culture?")

**Question Metadata**:
- Question text
- Category tags (can belong to multiple)
- Difficulty level (Beginner, Intermediate, Advanced)
- Common follow-up questions
- What interviewers are looking for (key traits)
- Related questions (for practice variety)
- Company associations (which companies ask this frequently)

**Example Questions by Category**:

**Technical Leadership**:
- "Tell me about a time you led a technical project from conception to deployment"
- "Describe a situation where you had to mentor a junior engineer on a complex technical concept"
- "How do you handle technical disagreements when leading a team?"

**Code Review & Collaboration**:
- "Tell me about a time you disagreed with a code review comment. How did you handle it?"
- "Describe a situation where you had to convince your team to adopt a different technical approach"
- "Tell me about working with a difficult code reviewer or team member"

**Debugging & Problem Solving**:
- "What's the most challenging bug you've ever debugged? Walk me through your process"
- "Tell me about a time you had to debug a production issue under pressure"
- "Describe a situation where you had to solve a problem with limited information or resources"

**System Design & Architecture**:
- "Tell me about a time you had to refactor a large codebase or system"
- "Describe a situation where you improved a system's architecture or design"
- "Tell me about a time you had to make a trade-off between different architectural approaches"

**Technical Failure & Recovery**:
- "Tell me about a time you introduced a bug to production. What did you learn?"
- "Describe a technical mistake you made and how you recovered from it"
- "Tell me about a time a system you built failed. How did you handle it?"

**Technical Debt & Prioritization**:
- "How do you balance shipping features quickly vs. writing maintainable, scalable code?"
- "Tell me about a time you had to prioritize technical debt vs. new features"
- "Describe a situation where you had to make a quick technical decision that you knew wasn't ideal long-term"

**Technical Communication**:
- "Tell me about explaining a complex technical concept to a non-technical stakeholder"
- "Describe a time you had to document or present a technical design to your team"
- "Tell me about a time you had to communicate a technical problem to management"

**Technical Initiative**:
- "Tell me about a time you identified and fixed a performance bottleneck"
- "Describe a situation where you proactively improved a system's efficiency or reliability"
- "Tell me about a time you went beyond your assigned tasks to improve code quality"

**Learning New Technologies**:
- "Tell me about a time you had to quickly learn a new technology or framework for a project"
- "Describe how you stay current with new technologies and best practices"
- "Tell me about a challenging technical concept you had to learn on the job"

**Code Quality & Best Practices**:
- "Tell me about a time you had to convince your team to adopt a new tool, framework, or practice"
- "Describe a situation where you improved code quality or established new coding standards"
- "Tell me about a time you had to enforce code quality standards on a project"

**Scaling & Performance**:
- "Tell me about a time you optimized a system that was too slow or couldn't handle load"
- "Describe a situation where you had to scale a system to handle increased traffic"
- "Tell me about a performance issue you identified and resolved"

**Features**:
- Searchable/filterable question bank
- Mark questions as "practiced" or "mastered"
- Favorite/bookmark important questions
- Difficulty progression recommendations
- Link to related coding problems (e.g., "Tell me about debugging" → link to debugging-related problems on platform)

---

### 2. Story Library (Personal Experience Bank)

**Purpose**: Users build a repository of their own experiences that can be adapted to answer different behavioral questions

**Story Structure** (STAR format):
- **Situation**: Context and background
- **Task**: What needed to be accomplished
- **Action**: What you specifically did
- **Result**: Outcome and what you learned

**Story Metadata**:
- Title/name for easy reference
- Tags/categories (technical_leadership, debugging, etc.)
- Date/context (when it happened)
- Key technical skills demonstrated (e.g., "system design", "performance optimization", "code review")
- Technologies/tools involved (e.g., "React", "PostgreSQL", "AWS")
- Metrics/quantifiable results (e.g., "reduced latency by 40%", "fixed 15 production bugs")
- Versatility score (how many question types it can answer)
- Related problem IDs (link to coding problems on platform if applicable)
- Last used date
- Practice count

**Features**:
- Story builder with guided prompts
- AI suggestions for improving stories
- Story matching: "Which of your stories best answers this question?"
- Story adaptation: "How can you reframe this story for a different question?"
- Export stories for offline review
- Story templates/examples

**Story Matching Algorithm**:
- When user selects a question, AI suggests which stories from their library best fit
- Shows match score and why it's a good fit
- Highlights which parts of STAR need emphasis for this question

---

### 3. Practice Session System

**Purpose**: Simulated interview practice with AI interviewer

**Session Types**:

#### A. Guided Practice (Recommended for beginners)
- AI asks a question
- User types/records their answer
- AI provides structured feedback:
  - STAR completeness check
  - Clarity and conciseness
  - Specificity (avoiding vague answers)
  - Quantifiable results presence
- Suggests improvements
- Option to revise and re-submit

#### B. Mock Interview Mode
- Series of 3-5 questions in one session
- Timer for each answer (2-3 minutes typical)
- No feedback during session (realistic)
- Comprehensive feedback at the end
- Overall performance score

#### C. Company-Specific Practice
- Questions tailored to specific company
- Company culture context provided
- Follow-up questions based on company's interview style
- "What would [Company] interviewers look for?" insights

**Session Features**:
- Voice recording option (practice speaking, not just writing)
- Transcript of spoken answers
- Time tracking per question
- Pause/resume capability
- Save draft answers
- Review past sessions

---

### 4. AI Feedback & Scoring System

**Purpose**: Detailed, actionable feedback on user answers

**Feedback Dimensions**:

1. **STAR Structure** (0-100 score)
   - Situation: Clear context provided?
   - Task: Objective clearly stated?
   - Action: Specific actions taken (not "we did X")?
   - Result: Measurable outcomes included?

2. **Content Quality** (0-100 score)
   - Specificity: Concrete examples vs. vague statements
   - Relevance: Does it answer the question asked?
   - Quantification: Numbers/metrics included?
   - Learning: Shows growth/reflection?

3. **Delivery** (0-100 score)
   - Clarity: Easy to understand?
   - Conciseness: Right length (not too long/short)?
   - Confidence: Professional tone?
   - Engagement: Compelling narrative?

4. **Overall Score** (weighted average)

**Feedback Format**:
- Overall score with breakdown
- Strengths highlighted
- Specific areas for improvement
- Example of how to improve a specific part
- Comparison to model answer (if available)
- Next steps/recommendations

**Progressive Feedback**:
- First attempt: Focus on structure (STAR completeness)
- Second attempt: Focus on content quality
- Third attempt: Focus on delivery and polish

---

### 5. Answer Builder Tool

**Purpose**: Interactive tool to help users construct well-structured answers

**Guided Workflow**:
1. Select question
2. AI suggests matching stories from library
3. User selects story or creates new one
4. Step-by-step builder:
   - **Situation**: Prompt questions to extract context
   - **Task**: Help identify the objective
   - **Action**: Guide to be specific about personal actions
   - **Result**: Encourage quantifiable outcomes
5. Real-time feedback as they build
6. Save to story library
7. Practice delivering the answer

**Smart Features**:
- Auto-suggestions for each STAR section
- "Make it more specific" prompts
- "Add metrics" suggestions
- "Show your impact" guidance
- Preview mode (how it sounds when delivered)

---

### 6. Progress Tracking & Analytics

**Purpose**: Monitor improvement and identify areas needing work

**Metrics Tracked**:
- Questions practiced (total, by category)
- Stories created
- Average scores (overall, by dimension)
- Improvement trends over time
- Time spent practicing
- Categories mastered vs. needs work
- Practice streak

**Dashboard Views**:
- **Overview**: High-level stats and recent activity
- **Category Breakdown**: Performance by question type
- **Score Trends**: Graph showing improvement over time
- **Weak Areas**: Categories with lowest scores
- **Practice Calendar**: Heatmap of practice frequency

**Recommendations**:
- "You haven't practiced technical leadership questions in a while"
- "Your debugging & problem solving answers need work"
- "Great improvement on system design questions!"
- "Try these related questions next"

---

### 7. Company-Specific Preparation

**Purpose**: Tailor practice to specific companies

**Company Profiles**:
- Common behavioral questions asked
- Interview style (formal, casual, technical-behavioral mix)
- Culture values they look for
- Typical interview format (panel, 1-on-1, etc.)
- "Why this company?" question variations
- Follow-up question patterns

**Features**:
- Company-specific question sets
- Practice sessions mimicking their style
- Culture fit assessment
- "Tell me about yourself" variations by company
- Salary negotiation prep (if applicable)

---

## User Flows

### Flow 1: First-Time User
1. Onboarding: Explain STAR method with examples
2. Create first story: Guided story builder
3. Practice first question: Use their story to answer
4. Receive feedback and see improvement suggestions
5. Continue building story library

### Flow 2: Regular Practice Session
1. Browse question bank or get recommended question
2. Select question
3. AI suggests matching stories
4. Choose story or create new
5. Practice answering (type or record)
6. Get feedback
7. Revise if needed
8. Mark as practiced

### Flow 3: Mock Interview Prep
1. Select "Mock Interview" mode
2. Choose company (optional) or general
3. Set number of questions (3-5)
4. Complete interview with timer
5. Review comprehensive feedback
6. See overall performance score
7. Identify areas to improve

### Flow 4: Story Library Management
1. View all stories
2. Edit/improve existing stories
3. Get AI suggestions for enhancement
4. See which questions each story can answer
5. Archive old stories
6. Create new stories from templates

---

## Technical Architecture

### Database Schema

#### `behavioral_questions`
```sql
- id (uuid)
- question_text (text)
- category (text[]) -- array of categories
- difficulty (enum: beginner, intermediate, advanced)
- follow_up_questions (jsonb) -- array of related questions
- key_traits (text[]) -- what interviewers look for
- related_question_ids (uuid[])
- company_associations (text[]) -- which companies ask this
- created_at, updated_at
```

#### `user_stories`
```sql
- id (uuid)
- user_id (uuid)
- title (text)
- situation (text)
- task (text)
- action (text)
- result (text)
- tags (text[]) -- technical_leadership, debugging, etc.
- technical_skills (text[]) -- system_design, performance_optimization, code_review, etc.
- technologies (text[]) -- React, PostgreSQL, AWS, etc.
- metrics (text) -- quantifiable results (e.g., "reduced latency by 40%")
- related_problem_ids (text[]) -- links to problems table if applicable
- versatility_score (integer) -- calculated
- last_used_at (timestamptz)
- practice_count (integer)
- created_at, updated_at
```

#### `practice_sessions`
```sql
- id (uuid)
- user_id (uuid)
- session_type (enum: guided, mock, company_specific)
- company_id (uuid, nullable) -- if company-specific
- started_at (timestamptz)
- completed_at (timestamptz)
- total_questions (integer)
- average_score (numeric)
```

#### `practice_answers`
```sql
- id (uuid)
- session_id (uuid)
- question_id (uuid)
- story_id (uuid, nullable) -- which story they used
- answer_text (text)
- answer_audio_url (text, nullable) -- if voice recorded
- transcript (text, nullable)
- time_spent_seconds (integer)
- star_score (jsonb) -- {situation: 85, task: 90, action: 75, result: 80}
- content_score (integer)
- delivery_score (integer)
- overall_score (integer)
- feedback (jsonb) -- detailed feedback object
- revision_count (integer)
- created_at, updated_at
```

#### `user_behavioral_stats`
```sql
- user_id (uuid)
- total_questions_practiced (integer)
- total_stories_created (integer)
- average_overall_score (numeric)
- category_scores (jsonb) -- {technical_leadership: 85, debugging: 72, system_design: 80, ...}
- practice_streak (integer)
- last_practiced_at (timestamptz)
- updated_at (timestamptz)
```

#### `company_profiles`
```sql
- id (uuid)
- name (text)
- common_questions (uuid[]) -- references behavioral_questions
- interview_style (text)
- culture_values (text[])
- typical_format (text)
- created_at, updated_at
```

### AI Integration

**Edge Function**: `supabase/functions/behavioral-interview-chat/index.ts`

**Key AI Functions**:
1. **Story Matching**: Given a question, suggest best stories from user's library
2. **Answer Evaluation**: Score and provide feedback on user answers
3. **Story Improvement**: Suggest enhancements to user stories
4. **Question Generation**: Generate follow-up questions based on answer
5. **Mock Interview**: Conduct realistic interview simulation

**Prompt Engineering**:
- Use structured prompts for consistent scoring
- Include STAR framework guidelines
- Provide examples of good vs. bad answers
- Context-aware feedback (consider user's experience level)

### Frontend Components

**Pages**:
- `/behavioral` - Main behavioral interview hub
- `/behavioral/questions` - Question bank browser
- `/behavioral/stories` - Story library management
- `/behavioral/practice/:questionId` - Practice a specific question
- `/behavioral/mock-interview` - Mock interview mode
- `/behavioral/companies/:companyId` - Company-specific prep

**Components**:
- `BehavioralQuestionCard` - Display question with metadata
- `StoryBuilder` - Guided story creation tool
- `AnswerBuilder` - Step-by-step answer construction
- `PracticeSession` - Main practice interface
- `FeedbackPanel` - Display AI feedback with scores
- `StoryLibrary` - Browse and manage stories
- `ProgressDashboard` - Analytics and tracking
- `STARFrameworkGuide` - Educational component

**Hooks**:
- `useBehavioralQuestions` - Fetch and filter questions
- `useUserStories` - Manage story library
- `usePracticeSession` - Handle practice session state
- `useAnswerFeedback` - Get and display AI feedback
- `useBehavioralStats` - Track progress

---

## Integration with Existing Features

### Leverage AI Chat System
- Reuse `AIChat` component architecture
- Adapt coaching prompts for behavioral context
- Use similar message/response patterns

### Leverage Progress Tracking
- Similar to `user_statistics` for coding problems
- Extend dashboard to show behavioral prep stats
- Add behavioral prep to `RecentActivity` component

### Leverage Notes System
- Allow notes on questions/stories
- Similar local-first caching approach

### Leverage Voice Features
- Use existing `useSpeechToText` hook
- Record practice answers
- Transcribe for analysis

### Integration with Coding Problems
- Link behavioral stories to problems solved on platform
- Suggest behavioral questions based on problem categories (e.g., after solving a graph problem, suggest "Tell me about a time you worked with complex data structures")
- Cross-reference: "You solved [Problem X] - this could be a great story for debugging questions"
- Track technical skills from both coding practice and behavioral stories

---

## UI/UX Considerations

### Design Principles
- **Non-intimidating**: Behavioral interviews can be stressful; make it feel safe to practice
- **Encouraging**: Positive reinforcement, celebrate small wins
- **Educational**: Always explain why feedback is given
- **Flexible**: Support both quick practice and deep prep

### Visual Design
- Warm, approachable color scheme (vs. technical blue/gray)
- Story cards with visual hierarchy
- Progress indicators that feel rewarding
- Smooth transitions between practice and feedback

### Accessibility
- Full keyboard navigation
- Screen reader support for feedback
- Captions for audio recordings
- Clear visual feedback for all interactions

---

## Success Metrics

### User Engagement
- % of users who try behavioral prep
- Average sessions per user
- Stories created per user
- Questions practiced per user

### Learning Outcomes
- Average score improvement over time
- % of users who master STAR method
- Category coverage (do users practice all types?)

### Feature Adoption
- Answer builder usage
- Mock interview completion rate
- Story library growth
- Company-specific prep usage

---

## Future Enhancements

### Phase 2 Ideas
- **Peer Practice**: Practice with other users
- **Video Practice**: Record video answers (for video interviews)
- **Interview Simulation**: Full interview with multiple rounds
- **Resume Integration**: Link stories to resume bullet points
- **Interview Prep Calendar**: Schedule practice sessions
- **Mobile App**: Practice on-the-go

### Advanced Features
- **AI Interviewer Voice**: Realistic voice interaction
- **Emotion Detection**: Analyze confidence/tone in recordings
- **Collaborative Stories**: Team members share stories
- **Interview Question Generator**: AI creates custom questions
- **Industry-Specific Prep**: Tech vs. finance vs. consulting

---

## Implementation Priority

### MVP (Minimum Viable Product)
1. Question bank with basic categories
2. Story library (create, view, edit)
3. Basic practice session (type answer, get feedback)
4. Simple STAR scoring
5. Progress tracking basics

### Phase 1 (Full Core Features)
1. Answer builder tool
2. Mock interview mode
3. Enhanced AI feedback
4. Company-specific questions
5. Comprehensive analytics

### Phase 2 (Polish & Scale)
1. Voice recording
2. Story matching algorithm
3. Advanced progress tracking
4. Mobile optimization
5. Community features (if desired)

---

## Open Questions for Discussion

1. **Gamification**: Should we add points/badges/achievements?
2. **Social Features**: Allow sharing stories or practicing with others?
3. **Premium Features**: What should be free vs. paid?
4. **Integration Depth**: How much should this integrate with coding problems? (e.g., Link behavioral stories to specific problems solved on the platform - "Tell me about a time you debugged a difficult bug" could reference actual problems they've solved)
5. **Feedback Granularity**: How detailed should AI feedback be? (risk of overwhelming)
6. **Story Privacy**: Should stories be private only, or option to share?
7. **Template Stories**: Provide example stories for users to learn from?

---

## Conclusion

This behavioral interview prep feature would provide comprehensive coverage of the non-technical interview aspect, complementing the existing technical prep. It leverages the platform's strengths (AI coaching, progress tracking, user-friendly design) while introducing new patterns (story library, answer builder) that are specific to behavioral interviews.

The feature is designed to be:
- **Comprehensive**: Covers all major behavioral question types
- **Educational**: Teaches STAR method through practice
- **Personalized**: Adapts to user's experiences and goals
- **Actionable**: Provides specific, implementable feedback
- **Scalable**: Can grow with additional questions, companies, features

