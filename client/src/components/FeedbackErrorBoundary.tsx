
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class FeedbackErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 [FEEDBACK-ERROR-BOUNDARY] Error caught:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to monitoring service if available
    if (typeof window !== 'undefined' && (window as any).reportError) {
      (window as any).reportError(error);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Card className="w-full max-w-md mx-auto mt-8 border-red-200 bg-red-50">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-2">
              <AlertTriangle className="h-12 w-12 text-red-500" />
            </div>
            <CardTitle className="text-red-800">
              Erro no Sistema de Feedback
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-red-700 text-sm">
              Ocorreu um erro inesperado no sistema de avisos e feedback. 
              Nossa equipe foi notificada automaticamente.
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="bg-red-100 p-3 rounded border text-left">
                <p className="text-xs font-mono text-red-800 mb-2">
                  <strong>Error:</strong> {this.state.error.message}
                </p>
                {this.state.errorInfo && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-red-700 font-semibold mb-1">
                      Stack Trace
                    </summary>
                    <pre className="text-red-600 whitespace-pre-wrap overflow-auto max-h-32">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex gap-2 justify-center">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={this.handleRetry}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Tentar Novamente
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => window.location.reload()}
              >
                Recarregar Página
              </Button>
            </div>

            <p className="text-xs text-red-600 mt-4">
              Se o problema persistir, entre em contato com o suporte técnico.
            </p>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export const useFeedbackErrorHandler = () => {
  const handleError = React.useCallback((error: Error, errorInfo?: ErrorInfo) => {
    console.error('🚨 [FEEDBACK-ERROR-HANDLER] Error in feedback system:', error);
    
    // Report to monitoring service
    if (typeof window !== 'undefined' && (window as any).reportError) {
      (window as any).reportError(error);
    }
  }, []);

  return { handleError };
};

export default FeedbackErrorBoundary;
