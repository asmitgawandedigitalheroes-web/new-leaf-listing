import { Link } from 'react-router-dom';
import NLVLogo from '../components/ui/NLVLogo';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <div className="mb-8">
        <NLVLogo mode="light" size="md" />
      </div>
      <div className="text-8xl font-black text-gray-200 mb-4 select-none">404</div>
      <h1 className="text-2xl font-black text-gray-800 mb-2">Page not found</h1>
      <p className="text-sm text-gray-500 max-w-sm mb-8">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white no-underline transition-all"
        style={{ background: '#D4AF37' }}
        onMouseEnter={e => { e.currentTarget.style.background = '#B8962E'; }}
        onMouseLeave={e => { e.currentTarget.style.background = '#D4AF37'; }}
      >
        ← Back to Homepage
      </Link>
    </div>
  );
}
