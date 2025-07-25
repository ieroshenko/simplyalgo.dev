-- Create enums
CREATE TYPE public.difficulty_level AS ENUM ('Easy', 'Medium', 'Hard');
CREATE TYPE public.problem_status AS ENUM ('solved', 'attempted', 'not-started');
CREATE TYPE public.attempt_status AS ENUM ('pending', 'passed', 'failed', 'error');

-- Categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Problems table
CREATE TABLE public.problems (
  id TEXT NOT NULL PRIMARY KEY,
  title TEXT NOT NULL,
  difficulty difficulty_level NOT NULL,
  category_id UUID REFERENCES public.categories(id) NOT NULL,
  description TEXT NOT NULL,
  function_signature TEXT NOT NULL,
  examples JSONB NOT NULL DEFAULT '[]',
  constraints JSONB NOT NULL DEFAULT '[]',
  hints JSONB NOT NULL DEFAULT '[]',
  acceptance_rate DECIMAL(5,2) DEFAULT 0,
  likes INTEGER DEFAULT 0,
  dislikes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Test cases table
CREATE TABLE public.test_cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  problem_id TEXT REFERENCES public.problems(id) ON DELETE CASCADE NOT NULL,
  input TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  is_example BOOLEAN DEFAULT false,
  explanation TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User profiles table
CREATE TABLE public.user_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User statistics table
CREATE TABLE public.user_statistics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  total_solved INTEGER DEFAULT 0,
  easy_solved INTEGER DEFAULT 0,
  medium_solved INTEGER DEFAULT 0,
  hard_solved INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  max_streak INTEGER DEFAULT 0,
  ai_sessions INTEGER DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User problem attempts table
CREATE TABLE public.user_problem_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  problem_id TEXT REFERENCES public.problems(id) ON DELETE CASCADE NOT NULL,
  code TEXT,
  language TEXT DEFAULT 'python',
  status attempt_status DEFAULT 'pending',
  test_results JSONB DEFAULT '[]',
  execution_time INTEGER,
  memory_usage INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User starred problems table
CREATE TABLE public.user_starred_problems (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  problem_id TEXT REFERENCES public.problems(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, problem_id)
);

-- AI chat sessions table
CREATE TABLE public.ai_chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  problem_id TEXT REFERENCES public.problems(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- AI chat messages table
CREATE TABLE public.ai_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.ai_chat_sessions(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_problem_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_starred_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for categories (public read access)
CREATE POLICY "Categories are viewable by everyone" 
ON public.categories FOR SELECT USING (true);

-- Create RLS policies for problems (public read access)
CREATE POLICY "Problems are viewable by everyone" 
ON public.problems FOR SELECT USING (true);

-- Create RLS policies for test_cases (public read access)
CREATE POLICY "Test cases are viewable by everyone" 
ON public.test_cases FOR SELECT USING (true);

-- Create RLS policies for user_profiles
CREATE POLICY "Users can view their own profile" 
ON public.user_profiles FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.user_profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for user_statistics
CREATE POLICY "Users can view their own statistics" 
ON public.user_statistics FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own statistics" 
ON public.user_statistics FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own statistics" 
ON public.user_statistics FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for user_problem_attempts
CREATE POLICY "Users can view their own attempts" 
ON public.user_problem_attempts FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own attempts" 
ON public.user_problem_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own attempts" 
ON public.user_problem_attempts FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for user_starred_problems
CREATE POLICY "Users can view their own starred problems" 
ON public.user_starred_problems FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can star problems" 
ON public.user_starred_problems FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unstar problems" 
ON public.user_starred_problems FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for ai_chat_sessions
CREATE POLICY "Users can view their own chat sessions" 
ON public.ai_chat_sessions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chat sessions" 
ON public.ai_chat_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat sessions" 
ON public.ai_chat_sessions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat sessions" 
ON public.ai_chat_sessions FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for ai_chat_messages
CREATE POLICY "Users can view messages from their own sessions" 
ON public.ai_chat_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.ai_chat_sessions 
    WHERE ai_chat_sessions.id = ai_chat_messages.session_id 
    AND ai_chat_sessions.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create messages in their own sessions" 
ON public.ai_chat_messages FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.ai_chat_sessions 
    WHERE ai_chat_sessions.id = ai_chat_messages.session_id 
    AND ai_chat_sessions.user_id = auth.uid()
  )
);

-- Create indexes for better performance
CREATE INDEX idx_problems_category_id ON public.problems(category_id);
CREATE INDEX idx_problems_difficulty ON public.problems(difficulty);
CREATE INDEX idx_test_cases_problem_id ON public.test_cases(problem_id);
CREATE INDEX idx_test_cases_is_example ON public.test_cases(is_example);
CREATE INDEX idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX idx_user_statistics_user_id ON public.user_statistics(user_id);
CREATE INDEX idx_user_problem_attempts_user_id ON public.user_problem_attempts(user_id);
CREATE INDEX idx_user_problem_attempts_problem_id ON public.user_problem_attempts(problem_id);
CREATE INDEX idx_user_problem_attempts_status ON public.user_problem_attempts(status);
CREATE INDEX idx_user_starred_problems_user_id ON public.user_starred_problems(user_id);
CREATE INDEX idx_ai_chat_sessions_user_id ON public.ai_chat_sessions(user_id);
CREATE INDEX idx_ai_chat_messages_session_id ON public.ai_chat_messages(session_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_problems_updated_at
  BEFORE UPDATE ON public.problems
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_statistics_updated_at
  BEFORE UPDATE ON public.user_statistics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_problem_attempts_updated_at
  BEFORE UPDATE ON public.user_problem_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_chat_sessions_updated_at
  BEFORE UPDATE ON public.ai_chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to automatically create user profile and statistics
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'name', NEW.email);
  
  INSERT INTO public.user_statistics (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();