import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">AT Protocol Marketplace</h1>
        <p className="text-xl mb-8">
          A local marketplace built on the AT Protocol, allowing you to buy and sell items within your community.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4">Sell Something</h2>
            <p className="mb-4">
              Create a listing for items you want to sell in your local area.
            </p>
            <Link 
              href="/create-listing"
              className="inline-block py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md"
            >
              Create Listing
            </Link>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4">Find Something</h2>
            <p className="mb-4">
              Browse listings in your area to find what you're looking for.
            </p>
            <Link 
              href="/browse"
              className="inline-block py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md"
            >
              Browse Listings
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
