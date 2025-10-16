import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { Card, CardTitle, CardContent } from "./ui/Card";
import { Button } from "./ui/Button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  private handleRefresh = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="text-center p-6">
              <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
              <CardTitle className="mb-2">Something went wrong</CardTitle>
              <p className="text-sm text-muted-foreground mb-4">
                {this.state.error?.message || "An unexpected error occurred"}
              </p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={this.handleReset}>
                  Try Again
                </Button>
                <Button onClick={this.handleRefresh}>Refresh Page</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
