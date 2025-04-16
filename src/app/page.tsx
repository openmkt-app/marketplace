'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const { isLoggedIn } = useAuth();
  
  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Hero Section */}
      <section className="relative bg-primary-color py-20 overflow-hidden">
        <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-primary-color to-primary-light"></div>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute left-0 w-1/3 h-full bg-white transform -skew-x-12"></div>
          <div className="absolute right-0 w-1/4 h-full bg-white transform skew-x-12"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 text-on-primary">
              Buy, Sell & Connect in Your Community
            </h1>
            <p className="text-xl mb-8 text-white">
              Your neighborhood marketplace, powered by the same tech as your favorite social network.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/browse"
                className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-white text-primary-color font-medium text-lg hover:bg-neutral-light transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white focus:ring-offset-primary-color"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Check Out Listings
              </Link>
              {isLoggedIn ? (
                <Link
                  href="/create-listing"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-neutral-light text-primary-color font-medium text-lg hover:bg-neutral-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-light focus:ring-offset-primary-color"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Post Your Stuff
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-neutral-light text-primary-color font-medium text-lg hover:bg-neutral-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-light focus:ring-offset-primary-color"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Jump in & Start Selling
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12 text-text-primary">How This Thing Works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-lg shadow-lg bg-white text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
              <div className="inline-flex items-center justify-center w-16 h-16 mb-4 bg-primary-light/20 text-primary-color rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-text-primary">Snap & Post</h3>
              <p className="text-text-primary">
                Take a few pics, add a catchy description, set your price, and boom—your stuff is live for the neighborhood to see.
              </p>
            </div>
            
            <div className="p-6 rounded-lg shadow-lg bg-white text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
              <div className="inline-flex items-center justify-center w-16 h-16 mb-4 bg-primary-light/20 text-primary-color rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-text-primary">Discover Local Finds</h3>
              <p className="text-text-primary">
                Scroll through cool stuff nearby—no more shipping fees or waiting. Find what you need just around the corner.
              </p>
            </div>
            
            <div className="p-6 rounded-lg shadow-lg bg-white text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
              <div className="inline-flex items-center justify-center w-16 h-16 mb-4 bg-primary-light/20 text-primary-color rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-text-primary">Chat & Meet Up</h3>
              <p className="text-text-primary">
                Like something? Message the seller, agree on a meetup spot, and grab your new treasure same-day.
              </p>
            </div>
          </div>
          
          {/* New Features Section */}
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-center mb-8 text-text-primary">Cool New Stuff We Added</h2>
            <div className="bg-gradient-to-br from-background to-neutral-light p-8 rounded-xl shadow-md">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10 bg-primary-light/30 text-primary-color rounded-full mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1 text-text-primary">Photo Gallery That Doesn't Suck</h3>
                    <p className="text-text-primary">Swipe through multiple pics without the usual clunky interface most marketplaces have.</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10 bg-primary-light/30 text-primary-color rounded-full mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1 text-text-primary">Pics That Actually Show Details</h3>
                    <p className="text-text-primary">Upload up to 4 crystal-clear photos so buyers can see what they're getting into.</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10 bg-primary-light/30 text-primary-color rounded-full mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1 text-text-primary">All The Deets At A Glance</h3>
                    <p className="text-text-primary">Get the full scoop on every item without having to dig through a million tabs.</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10 bg-primary-light/30 text-primary-color rounded-full mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1 text-text-primary">Works On Whatever Device</h3>
                    <p className="text-text-primary">Browse on your phone, tablet, laptop—it looks sweet on all of them.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AT Protocol Info Section */}
      <section className="py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-1/2">
              <h2 className="text-3xl font-bold mb-6 text-text-primary">Backed By AT Protocol Magic</h2>
              <p className="text-lg text-text-primary mb-4">
                Remember Bluesky? Same tech powers this marketplace, giving you 
                all the good stuff of social networks but for buying and selling your things.
              </p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-color mr-2 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-text-primary">Use the same account across different apps</span>
                </li>
                <li className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-color mr-2 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-text-primary">Your stuff stays your stuff—no fine print shenanigans</span>
                </li>
                <li className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-color mr-2 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-text-primary">Better privacy than those other marketplaces (you know the ones)</span>
                </li>
              </ul>
              <a
                href="https://atproto.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-primary-color font-medium hover:text-primary-light"
              >
                Curious about AT Protocol? Check it out
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
            
            <div className="md:w-1/2 bg-white p-8 rounded-lg shadow-lg">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 mb-6 bg-primary-light/30 text-primary-color rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-4 text-text-primary">One Account, All Set</h3>
                <p className="text-text-primary mb-6">
                  Already on Bluesky? Just log in with the same account—no new passwords to remember!
                </p>
                {isLoggedIn ? (
                  <Link
                    href="/create-listing"
                    className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary-color text-white font-medium hover:bg-primary-light transition-colors"
                  >
                    Post Your First Item
                  </Link>
                ) : (
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary-color text-white font-medium hover:bg-primary-light transition-colors"
                  >
                    Sign In With Your Account
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary-color py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Ready to dive in?</h2>
            <p className="text-white mb-6 max-w-2xl mx-auto">
              Your next favorite item (or buyer) is waiting just around the corner.
            </p>
            <Link
              href="/browse"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-white text-primary-color font-medium text-lg hover:bg-neutral-light transition-colors"
            >
              Let's Go Shopping
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
