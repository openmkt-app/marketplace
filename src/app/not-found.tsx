import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 text-center">
            <h2 className="text-4xl font-bold text-primary-color mb-4">404</h2>
            <p className="text-xl text-text-primary mb-8">Page Not Found</p>
            <p className="text-text-secondary mb-8 max-w-md">
                The page you are looking for doesn't exist or has been moved.
            </p>
            <Link
                href="/"
                className="px-6 py-3 bg-primary-color text-white rounded-lg hover:bg-primary-light transition-colors font-medium shadow-sm"
            >
                Return Home
            </Link>
        </div>
    );
}
