export interface Problem {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: string;
  status: 'solved' | 'attempted' | 'not-started';
  isStarred: boolean;
  description: string;
  functionSignature: string;
  examples: Array<{
    input: string;
    output: string;
    explanation?: string;
  }>;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  stats: {
    totalSolved: number;
    streak: number;
    aiSessions: number;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface Category {
  name: string;
  solved: number;
  total: number;
  color: string;
}