import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState.jsx';

export default function NotFound() {
  return (
    <section className="card">
      <EmptyState
        icon="alert"
        title="Page not found"
        action={
          <Link to="/" className="btn btn-primary">
            Go to Overview
          </Link>
        }
      >
        This address doesn’t match any page in VEXA.
      </EmptyState>
    </section>
  );
}
