import { Component, type ErrorInfo, type ReactNode } from "react";
import { telemetryCollector } from "../services/telemetry.js";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  source?: string;
}

interface State {
  hasError: boolean;
  errorMessage: string | null;
}

export class TelemetryErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    errorMessage: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    telemetryCollector.recordError(
      `${error.message} (componentStack: ${errorInfo.componentStack || "none"})`,
      this.props.source || "ErrorBoundary",
    );
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, errorMessage: null });
  };

  public override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="panel error-boundary-fallback" role="alert" style={{ margin: "1rem" }}>
          <h2>{this.props.fallbackTitle || "Something went wrong in this view."}</h2>
          <p className="muted" style={{ margin: "0.5rem 0" }}>
            {this.state.errorMessage ||
              "An unhandled UI error was intercepted and logged to telemetry."}
          </p>
          <button
            type="button"
            className="button"
            onClick={this.handleReset}
            style={{ marginTop: "0.5rem" }}
          >
            Retry View
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
