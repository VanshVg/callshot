import type { ReactNode } from 'react';
import { Component } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/dashboard';
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-6">💥</div>
          <h1 className="text-white text-2xl font-bold mb-2">Something went wrong</h1>
          <p className="text-gray-400 text-sm mb-6 leading-relaxed">
            An unexpected error occurred. Your data is safe — try going back to the dashboard.
          </p>
          {this.state.error && (
            <pre className="text-left bg-[#1E1E1E] border border-[#2F2F2F] rounded-xl px-4 py-3 text-red-400 text-xs overflow-x-auto mb-6 whitespace-pre-wrap break-words">
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={this.handleReset}
            className="bg-[#FF6800] hover:bg-[#e05e00] text-white font-semibold px-6 py-2.5 rounded-xl transition-colors cursor-pointer"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }
}
