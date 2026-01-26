import { Suspense } from 'react';
import { Metadata } from 'next';
import CreateListingPageClient from './CreateListingPageClient';

export const metadata: Metadata = {
  title: 'Create a Listing | Open Market',
  description: 'Sell your items on Open Market. Create a new listing for free and reach local buyers.',
  alternates: {
    canonical: '/create-listing',
  },
};

export default function CreateListingPage() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto px-4 py-12 flex justify-center">
        <div className="animate-spin h-10 w-10 border-4 border-primary-color border-t-transparent rounded-full"></div>
      </div>
    }>
      <CreateListingPageClient />
    </Suspense>
  );
}
