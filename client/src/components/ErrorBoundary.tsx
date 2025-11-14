import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    console.error('🚨 Error Boundary caught error:', error);
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 Error Boundary - Full Error Details:', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      errorInfo: {
        componentStack: errorInfo.componentStack
      },
      timestamp: new Date().toISOString()
    });

    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback;
      
      if (FallbackComponent) {
        return <FallbackComponent error={this.state.error} />;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="max-w-md p-6 bg-card rounded-lg border border-border shadow-sm">
            <h2 className="text-lg font-semibold text-destructive mb-4">
              Erro no Dashboard
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Ocorreu um erro inesperado. Verifique o console do navegador para mais detalhes.
            </p>
            <details className="mb-4">
              <summary className="text-sm font-medium cursor-pointer mb-2">
                Detalhes técnicos
              </summary>
              <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                {this.state.error?.message}
                {'\n\n'}
                {this.state.error?.stack}
              </pre>
            </details>
            <button 
              onClick={() => window.location.reload()} 
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;