# SimplyAlgo - Master Coding Interviews

SimplyAlgo is a comprehensive coding interview preparation platform designed to help developers master algorithmic problem-solving through interactive practice, AI-powered assistance, and structured learning paths.

## Features

### Core Functionality

- **Interactive Code Editor**: Monaco-based editor with syntax highlighting, auto-completion, and theme customization.
- **Real-time Code Execution**: Integrated Judge0 API for running and testing code solutions.
- **Problem Management**: Curated collection of coding problems organized by categories and difficulty levels.
- **Progress Tracking**: Personal statistics and streak tracking to monitor learning progress.
- **Category-based Learning**: Problems organized by data structures and algorithmic patterns.

### Advanced Features

- **AI Chat Assistant**: Integrated AI-powered chat for hints, explanations, and debugging help.
- **Vim Mode Support**: Optional Vim keybindings for enhanced editor experience.
- **Theme Customization**: Multiple editor themes including light, dark, and custom options.
- **Auto-save**: Automatic code saving with persistence across sessions.
- **Test Results Panel**: Comprehensive test case execution with expected vs actual output comparison.
- **Keyboard Shortcuts**: VSCode-style shortcuts for enhanced productivity.

### User Experience

- **Responsive Design**: Optimized for desktop and mobile devices.
- **Modern UI**: Clean, intuitive interface built with Tailwind CSS and shadcn/ui components.
- **User Authentication**: Secure authentication system with Google OAuth integration.
- **Profile Management**: User profiles with avatar support and progress visualization.
- **Category Persistence**: Smart category filter persistence across navigation.

## Technology Stack

### Frontend

- **React 18**: Modern React with hooks and functional components.
- **TypeScript**: Type-safe development environment.
- **Vite**: Fast build tool and development server.
- **Tailwind CSS**: Utility-first CSS framework.
- **shadcn/ui**: Modern UI component library.
- **Monaco Editor**: VS Code's editor for web applications.
- **React Router**: Client-side routing.
- **Lucide React**: Modern icon library.

### Backend Services

- **Supabase**: Backend-as-a-Service for authentication and database.
- **Judge0 API**: Code execution and testing service.
- **Custom Node.js Server**: Code execution wrapper and test case processing.

### Development Tools

- **ESLint**: Code linting and style enforcement.
- **Prettier**: Code formatting.
- **PostCSS**: CSS processing and optimization.

## Project Structure

```plaintext
src/
├── components/          # Reusable UI components
│   ├── ui/              # Base UI components (shadcn/ui)
│   ├── CodeEditor.tsx   # Monaco editor wrapper
│   ├── ProblemTable.tsx # Problem listing component
│   └── Sidebar.tsx      # Navigation sidebar
├── hooks/               # Custom React hooks
│   ├── useAuth.tsx      # Authentication logic
│   ├── useAutoSave.ts   # Auto-save functionality
│   └── useProblems.tsx  # Problem data management
├── pages/               # Main application pages
│   ├── Dashboard.tsx    # User dashboard
│   ├── Problems.tsx# Problem browser
│   └── ProblemSolver.tsx# Code editor interface
├── lib/                 # Utility functions
├── types/               # TypeScript type definitions
└── assets/              # Static assets and images
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Judge0 API access (or local Judge0 server)

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/your-username/simplyalgo.git
   cd simplyalgo
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Set up environment variables:**

   ```bash
   cp .env.example .env.local
   ```

   Configure the following variables:
   - `VITE_SUPABASE_URL`: Your Supabase project URL.
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key.
   - `VITE_JUDGE0_API_URL`: Judge0 API endpoint.
   - `VITE_JUDGE0_API_KEY`: Judge0 API key (if required).

4. **Start the development server:**

   ```bash
   npm run dev
   ```

5. **Start the code execution server:**

   ```bash
   cd code-executor-api
   npm install
   npm start
   ```

### Database Setup

The application uses Supabase for data persistence. Set up the following tables:

1. **problems**: Stores coding problems with metadata.
2. **user_solutions**: Tracks user submissions and solutions.
3. **user_stats**: Stores user progress and statistics.
4. **user_profiles**: Extended user profile information.

## Core Components

### Code Editor (`src/components/CodeEditor.tsx`)

- Monaco editor integration with Python syntax highlighting.
- Theme management and persistence.
- Auto-save functionality with debouncing.
- Vim mode support (optional).
- Code execution controls.

### Problem Solver (`src/pages/ProblemSolver.tsx`)

- Main coding interface with resizable panels.
- Test results display with tabbed interface.
- Keyboard shortcuts for panel management.
- Real-time code testing and submission.

## API Integration

### Judge0 Integration

- Supports Python code execution.
- Handles test case processing.
- Provides execution results and error handling.
- Custom wrapper server for enhanced functionality.

### Supabase Integration

- User authentication with Google OAuth.
- Real-time data synchronization.
- Secure API access with Row Level Security.
- Optimistic updates for better UX.

## Development Workflow

### Code Quality

- ESLint configuration for consistent code style.
- TypeScript for type safety.
- Prettier for code formatting.
- Git hooks for pre-commit validation.

### Testing Strategy

- Component testing with React Testing Library.
- Integration testing for critical user flows.
- End-to-end testing for complete user journeys.

### Deployment

- Frontend: Vercel or Netlify.
- Backend: Supabase and custom server for Judge0.

## Contributing

1. Fork the repository.
2. Create a feature branch:

   ```bash
   git checkout -b feature/amazing-feature
   ```

3. Commit your changes:

   ```bash
   git commit -m "Add amazing feature"
   ```

4. Push to the branch:

   ```bash
   git push origin feature/amazing-feature
   ```

5. Open a Pull Request.

## Performance Optimizations

- **Code Splitting**: Dynamic imports for route-based code splitting.
- **Lazy Loading**: Lazy loading of heavy components.
- **Memoization**: React.memo and useMemo for expensive computations.
- **Debouncing**: Auto-save and search functionality debouncing.
- **Optimistic Updates**: Immediate UI updates for better perceived performance.

## Accessibility Features

- **Keyboard Navigation**: Full keyboard accessibility support.
- **Screen Reader Support**: Proper ARIA labels and semantic HTML.
- **Color Contrast**: WCAG compliant color schemes.
- **Focus Management**: Logical focus flow and visual indicators.

## Security Considerations

- **Input Validation**: Comprehensive input sanitization.
- **XSS Prevention**: Proper content escaping and CSP headers.
- **Authentication**: Secure token-based authentication.
- **API Security**: Rate limiting and request validation.
- **Data Privacy**: GDPR compliant data handling.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Support

For support and questions:

- Create an issue in the GitHub repository.
- Check the documentation for common solutions.
- Review the troubleshooting guide.

## Acknowledgments

- Judge0 for providing the code execution API.
- Supabase for the backend infrastructure.
- Monaco Editor team for the excellent code editor.
- The open-source community for various libraries and tools.
