'use client';

import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-neutral-light">
      <div className="container-custom">
        <div className="py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <h3 className="text-xl font-bold text-primary-color mb-4">
              Open Market
            </h3>
            <p className="text-text-primary text-sm mb-4">
              Reclaiming commerce for the community. Buy, sell, and trade freely on the open web—without the walled gardens.
            </p>
            <div className="flex space-x-4">
              <a href="https://bsky.app/profile/openmkt.app" target="_blank" rel="noopener noreferrer" className="text-text-secondary hover:text-primary-color transition-colors">
                <span className="sr-only">Bluesky</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 600 530" aria-hidden="true">
                  <path d="m135.72 44.03c66.496 49.921 138.02 151.14 164.28 205.46 26.262-54.316 97.782-155.54 164.28-205.46 47.98-36.021 125.72-63.892 125.72 24.795 0 17.712-10.155 148.79-16.111 170.07-20.703 73.984-96.144 92.854-163.25 81.433 117.3 19.964 147.14 86.092 82.697 152.22-122.39 125.59-175.91-31.511-189.63-71.766-2.514-7.3797-3.6904-10.832-3.7077-7.8964-0.0174-2.9357-1.1937 0.51669-3.7077 7.8964-13.714 40.255-67.233 197.36-189.63 71.766-64.444-66.128-34.605-132.26 82.697-152.22-67.108 11.421-142.55-7.4491-163.25-81.433-5.9562-21.282-16.111-152.36-16.111-170.07 0-88.687 77.742-60.816 125.72-24.795z" />
                </svg>
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 text-text-primary">Quick Links</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/" className="text-text-primary hover:text-primary-color transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/browse" className="text-text-primary hover:text-primary-color transition-colors">
                  Browse Listings
                </Link>
              </li>
              <li>
                <Link href="/create-listing" className="text-text-primary hover:text-primary-color transition-colors">
                  Create Listing
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-text-primary hover:text-primary-color transition-colors">
                  Sign In
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 text-text-primary">Community</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/what-is-open-market" className="text-text-primary hover:text-primary-color transition-colors">
                  What's Open Market?
                </Link>
              </li>
              <li>
                <Link href="/community/safety" className="text-text-primary hover:text-primary-color transition-colors">
                  Safety Tips
                </Link>
              </li>
              <li>
                <Link href="/community/seller-guide" className="text-text-primary hover:text-primary-color transition-colors">
                  Seller Guide
                </Link>
              </li>
              <li>
                <a href="https://github.com/openmkt-app/marketplace" target="_blank" rel="noopener noreferrer" className="text-text-primary hover:text-primary-color transition-colors font-medium">
                  Report a Bug
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 text-text-primary">Why Open?</h3>
            <p className="text-text-primary text-sm mb-4">
              Built on the AT Protocol. Your listings and reputation belong to you, not us. No hidden algorithms, no locked-in data.
            </p>
            <a
              href="https://atproto.com/articles/atproto-ethos"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-primary-color hover:text-primary-light transition-colors text-sm font-medium"
            >
              Why decentralization matters
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </a>
          </div>
        </div>

        <div className="py-4 border-t border-neutral-light text-sm text-text-primary text-center">
          <p>© {currentYear} Open Market (openmkt.app). All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
