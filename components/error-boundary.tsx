"use client";

import { Component, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="error-boundary" role="alert">
          <h2>Something went wrong</h2>
          <p className="error-message">{this.state.error.message}</p>
          <button className="btn btn-primary" onClick={() => this.setState({ error: null })}>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
