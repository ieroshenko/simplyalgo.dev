import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Problems from "./pages/Problems";
import SystemDesign from "./pages/SystemDesign";
import SystemDesignSolver from "./pages/SystemDesignSolver";
import ExcalidrawDesign from "./pages/ExcalidrawDesign";
import ProblemSolverNew from "./pages/ProblemSolverNew";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Survey from "./pages/Survey";
import FlashcardDeck from "./pages/FlashcardDeck";
import Behavioral from "./pages/Behavioral";
import BehavioralQuestions from "./pages/BehavioralQuestions";
import BehavioralStories from "./pages/BehavioralStories";
import BehavioralStoryNew from "./pages/BehavioralStoryNew";
import BehavioralPractice from "./pages/BehavioralPractice";
import BehavioralInterview from "./pages/BehavioralInterview";
import BehavioralMockInterview from "./pages/BehavioralMockInterview";
import TechnicalInterview from "./pages/TechnicalInterview";
import DataStructureRedirect from "./components/DataStructureRedirect";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/AdminDashboard";
import { ProtectedRoute } from "./components/route/ProtectedRoute";
import { AdminRoute } from "./components/route/AdminRoute";
import { Analytics } from '@vercel/analytics/react';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Auth />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/problems"
              element={
                <ProtectedRoute>
                  <Problems />
                </ProtectedRoute>
              }
            />
            <Route
              path="/arena"
              element={
                <ProtectedRoute>
                  <Problems />
                </ProtectedRoute>
              }
            />
            <Route
              path="/problem/:problemId"
              element={
                <ProtectedRoute>
                  <ProblemSolverNew />
                </ProtectedRoute>
              }
            />
            <Route
              path="/problems/:problemId"
              element={
                <ProtectedRoute>
                  <ProblemSolverNew />
                </ProtectedRoute>
              }
            />
            <Route
              path="/problems/data-structures/:slug"
              element={
                <ProtectedRoute>
                  <DataStructureRedirect />
                </ProtectedRoute>
              }
            />
            {/* System Design - Disabled for launch */}
            {/* <Route
              path="/system-design"
              element={
                <ProtectedRoute>
                  <SystemDesign />
                </ProtectedRoute>
              }
            />
            <Route
              path="/system-design/:problemId"
              element={
                <ProtectedRoute>
                  <SystemDesignSolver />
                </ProtectedRoute>
              }
            />
            <Route
              path="/excalidraw-design"
              element={
                <ProtectedRoute>
                  <ExcalidrawDesign />
                </ProtectedRoute>
              }
            /> */}
            <Route
              path="/progress"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tutor"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/survey/:stepNumber"
              element={
                <ProtectedRoute>
                  <Survey />
                </ProtectedRoute>
              }
            />
            <Route
              path="/flashcards"
              element={
                <ProtectedRoute>
                  <FlashcardDeck />
                </ProtectedRoute>
              }
            />
            <Route
              path="/behavioral"
              element={
                <ProtectedRoute>
                  <Behavioral />
                </ProtectedRoute>
              }
            />
            <Route
              path="/behavioral-interview"
              element={
                <ProtectedRoute>
                  <BehavioralInterview />
                </ProtectedRoute>
              }
            />
            <Route
              path="/technical-interview"
              element={
                <ProtectedRoute>
                  <TechnicalInterview />
                </ProtectedRoute>
              }
            />
            <Route
              path="/behavioral/questions"
              element={
                <ProtectedRoute>
                  <BehavioralQuestions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/behavioral/stories"
              element={
                <ProtectedRoute>
                  <BehavioralStories />
                </ProtectedRoute>
              }
            />
            <Route
              path="/behavioral/stories/new"
              element={
                <ProtectedRoute>
                  <BehavioralStoryNew />
                </ProtectedRoute>
              }
            />
            <Route
              path="/behavioral/practice"
              element={
                <ProtectedRoute>
                  <BehavioralPractice />
                </ProtectedRoute>
              }
            />
            <Route
              path="/behavioral/mock-interview"
              element={
                <ProtectedRoute>
                  <BehavioralMockInterview />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <Analytics />
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
