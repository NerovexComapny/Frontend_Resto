import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unexpected error',
    };
  }

  componentDidCatch(error, errorInfo) {
    // Keep console output for debugging in development and production logs.
    console.error('Unhandled UI error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a1628] text-slate-100 flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-[#0d1f3c] border border-[#1e3a5f] rounded-2xl p-6 text-center shadow-xl">
            <h1 className="text-2xl font-bold text-[#c9963a] mb-2">Something went wrong</h1>
            <p className="text-slate-300 text-sm mb-5">
              The page crashed unexpectedly. Please try reloading.
            </p>
            <p className="text-slate-500 text-xs mb-5 break-words">
              {this.state.errorMessage}
            </p>
            <button
              onClick={this.handleReload}
              className="px-5 py-2.5 rounded-xl bg-[#c9963a] text-[#0a1628] font-bold hover:bg-[#ad8335] transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
