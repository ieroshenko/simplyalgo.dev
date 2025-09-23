import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { logCoachingModeError, createCoachingModeError } from '@/services/coachingModeErrorRecovery';

interface Props {
  children: ReactNode;
  fallbackMode?: 'comprehensive' | 'socratic';
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * Error boundary specifically for coaching mode related components
 * Provides graceful fallback when coaching mode components fail
 */
export class CoachingModeErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error with coaching mode context
    const coachingError = createCoachingModeError(
      `React error in coaching mode component: ${error.message}`,
      'UNKNOWN',
      this.props.fallbackMode || 'comprehensive'
    );

    logCoachingModeError(coachingError, {
      componentStack: errorInfo.componentStack,
      errorBoundary: 'CoachingModeErrorBoundary',
      fallbackMode: this.props.fallbackMode
    });

    this.setState({ error, errorInfo });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Alert variant="destructive" className="m-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Coaching Mode Error</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-3">
              There was an issue with the coaching mode component. The chat will continue 
              to work in {this.props.fallbackMode || 'comprehensive'} mode.
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={this.handleRetry}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-3 w-3" />
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}

export default CoachingModeErrorBoundary;