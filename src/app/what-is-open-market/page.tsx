import Link from 'next/link';
import { ArrowLeft, ArrowRight, ShoppingBag, Store, Shield, MessageCircle, Globe, Search, Database, Lock, Users, ChevronDown, Sparkles, CircleCheck, Zap, AtSign, Camera, Link as LinkIcon } from 'lucide-react';

export const metadata = {
    title: 'What is Open Market?',
    description: 'Stop Renting Your Store. Start Owning It.',
};

export default function WhatIsOpenMarketPage() {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-24">
            {/* Header / Nav */}
            <div className="max-w-6xl mx-auto px-6 py-6 flex items-center gap-4">
                <Link href="/mall" className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-600">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <div className="font-bold text-xl">Open Market</div>
            </div>

            {/* Hero Section */}
            <div className="relative overflow-hidden mb-24">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full z-0 pointer-events-none">
                    <div className="absolute top-20 left-20 w-64 h-64 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
                    <div className="absolute top-40 right-20 w-72 h-72 bg-yellow-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-700"></div>
                </div>
                <div className="relative z-10 max-w-5xl mx-auto px-4 pt-16 pb-12 sm:pt-20 sm:pb-16 text-center">
                    <div className="transition-all duration-1000 transform opacity-100 translate-y-0" style={{ transitionDelay: '0ms' }}>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100 text-slate-500 text-xs font-semibold mb-6 hover:bg-white hover:shadow-sm transition-all cursor-default">
                            <Sparkles size={14} className="text-yellow-500" />
                            <span>Reclaiming commerce for the community</span>
                        </div>
                    </div>
                    <div className="transition-all duration-1000 transform opacity-100 translate-y-0" style={{ transitionDelay: '100ms' }}>
                        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 mb-6 tracking-tight leading-[1.1]">
                            The Marketplace for the <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-sky-400 to-blue-600 animate-gradient bg-[length:200%_auto]">Open Web.</span>
                        </h1>
                    </div>
                    <div className="transition-all duration-1000 transform opacity-100 translate-y-0" style={{ transitionDelay: '200ms' }}>
                        <p className="text-lg sm:text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed font-light">
                            Turn your Bluesky profile into a storefront. <br className="hidden sm:block" />
                            <span className="font-medium text-slate-900">Zero fees. No lock-in. 100% owned by you.</span>
                        </p>
                    </div>
                    <div className="transition-all duration-1000 transform opacity-100 translate-y-0" style={{ transitionDelay: '300ms' }}>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link href="/create-listing" className="w-full sm:w-auto bg-slate-900 text-white px-6 py-3 rounded-full font-bold text-base shadow-xl shadow-slate-200 hover:shadow-2xl hover:bg-blue-600 hover:shadow-blue-200 transition-all transform hover:-translate-y-1 flex items-center justify-center gap-2">
                                Claim My Shop <ArrowRight size={16} />
                            </Link>
                            <Link href="/mall" className="w-full sm:w-auto bg-white text-slate-700 border border-gray-200 px-6 py-3 rounded-full font-bold text-base hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center">
                                Explore Listings
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Section 1: The Why */}
            <div className="bg-white py-24 sm:py-32 border-y border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
                        <div className="transition-all duration-1000 transform opacity-100 translate-y-0" style={{ transitionDelay: '0ms' }}>
                            <div className="relative pl-8 border-l-4 border-gray-100">
                                <div className="mb-8">
                                    <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-6 rotate-3">
                                        <Users size={28} />
                                    </div>
                                    <h2 className="text-3xl font-bold text-slate-900 mb-4 leading-tight">
                                        Social media is great for connection, <span className="text-red-500 bg-red-50 px-2 rounded-md">but terrible for commerce.</span>
                                    </h2>
                                    <p className="text-slate-500 text-lg leading-relaxed">
                                        You post a product, and the algorithm buries it. You build an audience, and the platform holds them hostage.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="transition-all duration-1000 transform opacity-100 translate-y-0" style={{ transitionDelay: '200ms' }}>
                            <div className="bg-gradient-to-br from-slate-50 to-white rounded-[2.5rem] p-8 sm:p-12 border border-slate-100 shadow-2xl shadow-slate-200/50 relative overflow-hidden group hover:border-blue-100 transition-colors duration-500">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100/30 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-100/50 transition-colors duration-500"></div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-8">
                                        <div className="bg-blue-600 text-white p-2.5 rounded-xl shadow-lg shadow-blue-500/30">
                                            <Store size={22} />
                                        </div>
                                        <h3 className="font-bold text-2xl text-slate-900">Open Market changes that.</h3>
                                    </div>
                                    <p className="text-slate-600 mb-10 leading-relaxed font-medium">
                                        We built a decentralized marketplace directly on the AT Protocol. We don't "host" your shop, it's all yours—we just make it easier to find.
                                    </p>
                                    <ul className="space-y-6">
                                        <li className="flex gap-4 items-start">
                                            <div className="min-w-[24px] pt-1">
                                                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 shadow-sm">
                                                    <CircleCheck size={14} strokeWidth={3} />
                                                </div>
                                            </div>
                                            <div>
                                                <strong className="text-slate-900 text-base block mb-1">You Own Your Data</strong>
                                                <p className="text-sm text-slate-500 leading-relaxed">Your listings live in your personal repository (PDS), not just our database.</p>
                                            </div>
                                        </li>
                                        <li className="flex gap-4 items-start">
                                            <div className="min-w-[24px] pt-1">
                                                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 shadow-sm">
                                                    <CircleCheck size={14} strokeWidth={3} />
                                                </div>
                                            </div>
                                            <div>
                                                <strong className="text-slate-900 text-base block mb-1">You Own Your Audience</strong>
                                                <p className="text-sm text-slate-500 leading-relaxed">We don't use algorithms to hide your posts or shake you down for ads.</p>
                                            </div>
                                        </li>
                                        <li className="flex gap-4 items-start">
                                            <div className="min-w-[24px] pt-1">
                                                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 shadow-sm">
                                                    <CircleCheck size={14} strokeWidth={3} />
                                                </div>
                                            </div>
                                            <div>
                                                <strong className="text-slate-900 text-base block mb-1">You Are Portable</strong>
                                                <p className="text-sm text-slate-500 leading-relaxed">If you ever leave, you take your reputation, history, and listings with you.</p>
                                            </div>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Section 2: For Sellers */}
            <div className="py-24 bg-slate-50 border-t border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="transition-all duration-1000 transform opacity-100 translate-y-0" style={{ transitionDelay: '0ms' }}>
                        <div className="text-center max-w-2xl mx-auto mb-16">
                            <span className="text-blue-600 font-bold text-xs uppercase tracking-wider bg-blue-50 px-3 py-1 rounded-full">For Sellers</span>
                            <h2 className="text-3xl font-bold text-slate-900 mt-4 mb-4">"I already have an Etsy/Shopify. Why do I need this?"</h2>
                            <p className="text-slate-500 text-base">
                                We aren't trying to replace your main shop—we are here to <span className="font-bold text-slate-900 bg-yellow-100 px-1">supercharge it</span>.
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="transition-all duration-1000 transform opacity-100 translate-y-0" style={{ transitionDelay: '100ms' }}>
                            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-blue-900/5 hover:-translate-y-2 transition-all duration-300 h-full">
                                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                                    <Store size={28} />
                                </div>
                                <h3 className="font-bold text-xl text-slate-900 mb-3">The "Bluesky" Storefront</h3>
                                <p className="text-slate-500 text-sm leading-relaxed">Turn your Bluesky profile into a shop in one click. Give your social followers a place to buy instantly.</p>
                            </div>
                        </div>
                        <div className="transition-all duration-1000 transform opacity-100 translate-y-0" style={{ transitionDelay: '200ms' }}>
                            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-blue-900/5 hover:-translate-y-2 transition-all duration-300 h-full">
                                <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-6">
                                    <Globe size={28} />
                                </div>
                                <h3 className="font-bold text-xl text-slate-900 mb-3">Traffic Engine</h3>
                                <p className="text-slate-500 text-sm leading-relaxed">Link your Open Market listings directly to your Etsy or Shopify checkout. Use us for discovery, them for fulfillment.</p>
                            </div>
                        </div>
                        <div className="transition-all duration-1000 transform opacity-100 translate-y-0" style={{ transitionDelay: '300ms' }}>
                            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-blue-900/5 hover:-translate-y-2 transition-all duration-300 h-full">
                                <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mb-6">
                                    <Zap size={28} />
                                </div>
                                <h3 className="font-bold text-xl text-slate-900 mb-3">Zero Fees</h3>
                                <p className="text-slate-500 text-sm leading-relaxed">We don't charge listing fees or transaction fees. We verify, you sell. You keep 100% of the sale price.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Section 3: For the Community (Moved above How It Works) */}
            <section className="bg-slate-900 text-white py-24 rounded-3xl mx-4 md:mx-6 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>

                <div className="max-w-5xl mx-auto px-6 relative z-10">
                    <div className="text-center mb-16">
                        <span className="text-blue-400 font-bold uppercase tracking-wider text-sm">For the Community</span>
                        <h2 className="text-4xl font-bold mt-2 text-white">Commerce feels human again.</h2>
                        <p className="text-xl text-slate-300 mt-4 max-w-2xl mx-auto">
                            Remember when buying something meant talking to a person, not a bot?
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-12">
                        <div className="text-center">
                            <div className="bg-slate-800 border border-slate-700 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-900/20">
                                <Search className="w-8 h-8 text-blue-400" />
                            </div>
                            <h3 className="text-xl font-bold mb-2 text-white">Local Finds</h3>
                            <p className="text-slate-400">Discover furniture, gear, and collectibles in your actual neighborhood.</p>
                        </div>
                        <div className="text-center">
                            <div className="bg-slate-800 border border-slate-700 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-900/20">
                                <MessageCircle className="w-8 h-8 text-green-400" />
                            </div>
                            <h3 className="text-xl font-bold mb-2 text-white">Direct Chat</h3>
                            <p className="text-slate-400">Message sellers directly through Bluesky DMs. No middlemen.</p>
                        </div>
                        <div className="text-center">
                            <div className="bg-slate-800 border border-slate-700 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-purple-900/20">
                                <Shield className="w-8 h-8 text-purple-400" />
                            </div>
                            <h3 className="text-xl font-bold mb-2 text-white">Trusted Identity</h3>
                            <p className="text-slate-400">See exactly who you are dealing with—their join date, their posts, and their reputation.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Section: How It Works */}
            <div className="py-24 bg-white border-y border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-blue-600 font-bold tracking-wide uppercase text-xs mb-3">Seamless Integration</h2>
                        <h3 className="text-3xl sm:text-4xl font-black text-slate-900 mb-6">You already have an account.</h3>
                        <p className="text-lg text-slate-500 leading-relaxed">
                            Because we are built on the <span className="text-slate-900 font-semibold">AT Protocol</span>, you don't need to create a new profile. Your reputation travels with you.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
                        {/* Connecting Line */}
                        <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-gray-100 via-blue-100 to-gray-100 -z-10"></div>

                        {/* Step 1 */}
                        <div className="relative group">
                            <div className="bg-white p-2 w-24 h-24 mx-auto rounded-2xl border border-gray-100 shadow-sm mb-8 flex items-center justify-center group-hover:scale-110 group-hover:border-blue-200 group-hover:shadow-blue-100 transition-all duration-300 z-10 relative">
                                <div className="w-20 h-20 bg-sky-50 rounded-xl flex items-center justify-center text-sky-600">
                                    <AtSign size={32} />
                                </div>
                                <div className="absolute -top-3 -right-3 w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold border-4 border-white shadow-sm">1</div>
                            </div>
                            <div className="text-center px-2">
                                <h4 className="text-xl font-bold text-slate-900 mb-3">Log in with Bluesky</h4>
                                <p className="text-slate-500 leading-relaxed text-sm">We instantly fetch your avatar, banner, and handle. No new passwords to remember.</p>
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className="relative group">
                            <div className="bg-white p-2 w-24 h-24 mx-auto rounded-2xl border border-gray-100 shadow-sm mb-8 flex items-center justify-center group-hover:scale-110 group-hover:border-indigo-200 group-hover:shadow-indigo-100 transition-all duration-300 z-10 relative">
                                <div className="w-20 h-20 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                                    <Camera size={32} />
                                </div>
                                <div className="absolute -top-3 -right-3 w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold border-4 border-white shadow-sm">2</div>
                            </div>
                            <div className="text-center px-2">
                                <h4 className="text-xl font-bold text-slate-900 mb-3">List in Seconds</h4>
                                <p className="text-slate-500 leading-relaxed text-sm">Snap a photo, add a description, and set your price. It's quick and easy.</p>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div className="relative group">
                            <div className="bg-white p-2 w-24 h-24 mx-auto rounded-2xl border border-gray-100 shadow-sm mb-8 flex items-center justify-center group-hover:scale-110 group-hover:border-yellow-200 group-hover:shadow-yellow-100 transition-all duration-300 z-10 relative">
                                <div className="w-20 h-20 bg-yellow-50 rounded-xl flex items-center justify-center text-yellow-600">
                                    <Store size={32} />
                                </div>
                                <div className="absolute -top-3 -right-3 w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold border-4 border-white shadow-sm">3</div>
                            </div>
                            <div className="text-center px-2">
                                <h4 className="text-xl font-bold text-slate-900 mb-3">Sell Your Way</h4>
                                <div className="text-left bg-gray-50/50 rounded-xl p-4 mt-2 text-sm space-y-3 border border-gray-100">
                                    <div className="flex items-start gap-3">
                                        <div className="min-w-[20px] pt-0.5">
                                            <LinkIcon size={14} className="text-slate-400" />
                                        </div>
                                        <p className="text-slate-600 text-xs leading-5"><span className="font-bold text-slate-900 block">Online Stores</span>Link directly to your Etsy, Shopify, or Gumroad. We act as a traffic engine.</p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="min-w-[20px] pt-0.5">
                                            <MessageCircle size={14} className="text-slate-400" />
                                        </div>
                                        <p className="text-slate-600 text-xs leading-5"><span className="font-bold text-slate-900 block">Community Sellers</span>Arranging a local sale? Chat directly via Bluesky DMs.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Section 4: FAQ */}
            <section className="py-24 max-w-3xl mx-auto px-6">
                <h2 className="text-3xl font-bold mb-12 text-center">Frequently Asked Questions</h2>
                <div className="space-y-4">
                    {/* Q1 */}
                    <details className="group bg-white rounded-2xl border border-slate-200 open:border-blue-200 open:ring-4 open:ring-blue-50 transition-all">
                        <summary className="flex items-center justify-between p-6 font-bold text-lg cursor-pointer list-none text-slate-900">
                            Does it cost money?
                            <span className="transform group-open:rotate-180 transition-transform text-slate-400 group-open:text-blue-600">
                                <ChevronDown size={20} />
                            </span>
                        </summary>
                        <div className="px-6 pb-6 text-slate-600 leading-relaxed">
                            No. Open Market is free to use. We are a community-built project dedicated to the Open Web.
                        </div>
                    </details>

                    {/* Q2 */}
                    <details className="group bg-white rounded-2xl border border-slate-200 open:border-blue-200 open:ring-4 open:ring-blue-50 transition-all">
                        <summary className="flex items-center justify-between p-6 font-bold text-lg cursor-pointer list-none text-slate-900">
                            Who built this?
                            <span className="transform group-open:rotate-180 transition-transform text-slate-400 group-open:text-blue-600">
                                <ChevronDown size={20} />
                            </span>
                        </summary>
                        <div className="px-6 pb-6 text-slate-600 leading-relaxed">
                            Open Market is built by a single developer, for the community. I believe in the vision of the AT Protocol and a user-owned internet.
                        </div>
                    </details>

                    {/* Q3 */}
                    <details className="group bg-white rounded-2xl border border-slate-200 open:border-blue-200 open:ring-4 open:ring-blue-50 transition-all">
                        <summary className="flex items-center justify-between p-6 font-bold text-lg cursor-pointer list-none text-slate-900">
                            I already sell on Etsy. Why do I need this?
                            <span className="transform group-open:rotate-180 transition-transform text-slate-400 group-open:text-blue-600">
                                <ChevronDown size={20} />
                            </span>
                        </summary>
                        <div className="px-6 pb-6 text-slate-600 leading-relaxed">
                            Think of Open Market as your decentralized window display. It is a free discovery engine that puts your products in front of the Bluesky community without them having to dig through a chaotic feed. We act as your top-of-funnel marketing, driving ready-to-buy traffic directly to your Etsy store at no cost.
                        </div>
                    </details>

                    {/* Q4 */}
                    <details className="group bg-white rounded-2xl border border-slate-200 open:border-blue-200 open:ring-4 open:ring-blue-50 transition-all">
                        <summary className="flex items-center justify-between p-6 font-bold text-lg cursor-pointer list-none text-slate-900">
                            Is this a crypto thing?
                            <span className="transform group-open:rotate-180 transition-transform text-slate-400 group-open:text-blue-600">
                                <ChevronDown size={20} />
                            </span>
                        </summary>
                        <div className="px-6 pb-6 text-slate-600 leading-relaxed">
                            No. Open Market is a standard marketplace. We use the AT Protocol for data storage and identity, not for payments. You pay with cash, Venmo, or credit card (via the seller's external link).
                        </div>
                    </details>

                    {/* Q5 */}
                    <details className="group bg-white rounded-2xl border border-slate-200 open:border-blue-200 open:ring-4 open:ring-blue-50 transition-all">
                        <summary className="flex items-center justify-between p-6 font-bold text-lg cursor-pointer list-none text-slate-900">
                            Do I have to create a new account?
                            <span className="transform group-open:rotate-180 transition-transform text-slate-400 group-open:text-blue-600">
                                <ChevronDown size={20} />
                            </span>
                        </summary>
                        <div className="px-6 pb-6 text-slate-600 leading-relaxed">
                            No! You simply log in with your existing Bluesky credentials. Your profile, avatar, and banner come straight from your main account, we just display them in the app.
                        </div>
                    </details>
                </div>
            </section>

            {/* Footer / CTA */}
            <section className="text-center py-12 bg-white border-t border-slate-200">
                <div className="max-w-2xl mx-auto px-6">
                    <h2 className="text-3xl font-bold mb-8">Ready to reclaim your commerce?</h2>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link href="/create-listing" className="bg-slate-900 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-slate-800 transition-all shadow-xl hover:-translate-y-1">
                            Claim My Storefront
                        </Link>
                        <Link href="/mall" className="bg-white text-slate-900 border border-slate-200 px-8 py-4 rounded-full font-bold text-lg hover:bg-slate-50 transition-all">
                            Browse Listings
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
