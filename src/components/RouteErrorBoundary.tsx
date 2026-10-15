import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export interface RouteErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
}

export interface RouteErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class RouteErrorBoundary extends Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
  public override state: RouteErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): RouteErrorBoundaryState {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[RouteErrorBoundary] Caught route failure:', error, errorInfo);
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = (): void => {
    this.setState({ hasError: false, error: null });
    if (window.location.hash) {
      window.location.hash = '#/';
    } else {
      window.location.reload();
    }
  };

  public override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl border border-[#EAECF0] p-6 shadow-lg text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#FEF3F2] text-[#D92D20] mx-auto flex items-center justify-center border border-[#FEE4E2]">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold text-[#101828]">
                {this.props.fallbackTitle || 'Mô-đun chưa tải được'}
              </h2>
              <p className="text-xs text-[#667085] leading-relaxed">
                Đã xảy ra sự cố khi kết nối hoặc tải mô-đun ứng dụng. Vui lòng tải lại để tiếp tục.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleRetry}
                className="w-full sm:w-auto px-4 py-2 bg-[#D92D20] hover:bg-[#B42318] text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Tải lại</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="w-full sm:w-auto px-4 py-2 bg-[#F9FAFB] hover:bg-[#F2F4F7] text-[#344054] text-xs font-semibold rounded-lg flex items-center justify-center gap-2 border border-[#EAECF0] transition-colors cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Về trang chủ</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default RouteErrorBoundary;
