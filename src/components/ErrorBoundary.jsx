import { Component } from 'react';
import { STORAGE_KEY } from '../lib/storage.js';

// Catches render errors so one broken view never blanks the whole app.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('VEXA: a view crashed', error, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  downloadBackup = () => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY) || '{}';
      const blob = new Blob([raw], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'vexa-raw-backup.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('VEXA: backup download failed', err);
    }
  };

  render() {
    if (!this.state.error) return this.props.children;
    const full = this.props.fullPage;
    return (
      <div className={full ? 'crash crash-full' : 'crash'} role="alert">
        <h2>Something went wrong{full ? '' : ' on this page'}.</h2>
        <p className="muted">
          Your saved data has not been deleted. Try again, or download a raw backup of your data before reloading.
        </p>
        <p className="crash-detail">{String(this.state.error?.message || this.state.error)}</p>
        <div className="crash-actions">
          <button type="button" className="btn btn-primary" onClick={() => this.setState({ error: null })}>
            Try again
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => window.location.reload()}>
            Reload VEXA
          </button>
          <button type="button" className="btn btn-ghost" onClick={this.downloadBackup}>
            Download raw backup
          </button>
        </div>
      </div>
    );
  }
}
