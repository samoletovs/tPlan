import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import i18n from '../i18n';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      const t = i18n.t.bind(i18n);
      return (
        <div className="error-boundary">
          <h2>{t('error.title')}</h2>
          <p>{this.state.error?.message || t('error.generic')}</p>
          <button
            className="btn btn-secondary"
            style={{ width: 'auto' }}
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.href = '/app';
            }}
          >
            {t('error.returnButton')}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
