import React from 'react';

const P = '#D4AF37';
const S = '#1F4D3A';

/**
 * Catches unhandled render errors in any child component tree.
 * Prevents full-page white-screens and gives users a recovery path.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Caught error:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px',
          background: '#F9FAFB',
        }}
      >
        <div
          style={{
            maxWidth: 420,
            width: '100%',
            background: '#fff',
            border: '1px solid #E5E7EB',
            borderRadius: 16,
            padding: '40px 32px',
            textAlign: 'center',
            boxShadow: '0 4px 24px rgba(26,32,44,0.07)',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: '#FEF3C7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: 28,
            }}
          >
            ⚠️
          </div>

          <h2
            style={{
              fontWeight: 800,
              fontSize: 20,
              color: '#111111',
              marginBottom: 8,
            }}
          >
            Something went wrong
          </h2>

          <p style={{ color: '#6B7280', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
            {this.state.error?.message || 'An unexpected error occurred. Please try again.'}
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              onClick={this.handleReset}
              style={{
                padding: '10px 20px',
                background: P,
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
            <button
              onClick={() => window.location.assign('/')}
              style={{
                padding: '10px 20px',
                background: 'transparent',
                color: S,
                border: `1px solid ${S}`,
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Go home
            </button>
          </div>
        </div>
      </div>
    );
  }
}
