import Link from 'next/link';
import { Camera, Edit3, MessageCircle, DollarSign } from 'lucide-react';

export default function SellerGuidePage() {
    return (
        <div className="container-custom py-12">
            <div className="max-w-3xl mx-auto">
                <div className="mb-8">
                    <Link href="/" className="text-text-secondary hover:text-primary-color text-sm mb-4 inline-block">
                        ← Back to Home
                    </Link>
                    <h1 className="text-3xl font-bold text-primary-color mb-4">Seller Guide</h1>
                    <p className="text-text-secondary text-lg">
                        Ready to declutter and earn some extra cash? Follow these best practices to create listings that attract buyers and sell quickly on Open Market.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
                        <div className="bg-blue-50 w-12 h-12 flex items-center justify-center rounded-lg mb-4 text-primary-color">
                            <Camera size={24} />
                        </div>
                        <h2 className="text-xl font-semibold text-text-primary mb-3">1. Take Great Photos</h2>
                        <ul className="text-text-secondary space-y-2 text-sm list-disc pl-5">
                            <li>Use natural lighting whenever possible.</li>
                            <li>Take photos from multiple angles (front, back, sides).</li>
                            <li>Show any defects or wear honestly.</li>
                            <li>Use a clean, uncluttered background.</li>
                        </ul>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
                        <div className="bg-blue-50 w-12 h-12 flex items-center justify-center rounded-lg mb-4 text-primary-color">
                            <Edit3 size={24} />
                        </div>
                        <h2 className="text-xl font-semibold text-text-primary mb-3">2. Write Clear Descriptions</h2>
                        <ul className="text-text-secondary space-y-2 text-sm list-disc pl-5">
                            <li>Be descriptive in your title (brand, model, size).</li>
                            <li>Include dimensions and condition details.</li>
                            <li>Mention why you are selling it.</li>
                            <li>Use keywords buyers might search for.</li>
                        </ul>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
                        <div className="bg-blue-50 w-12 h-12 flex items-center justify-center rounded-lg mb-4 text-primary-color">
                            <DollarSign size={24} />
                        </div>
                        <h2 className="text-xl font-semibold text-text-primary mb-3">3. Price Competitively</h2>
                        <ul className="text-text-secondary space-y-2 text-sm list-disc pl-5">
                            <li>Research similar items to see what they sold for.</li>
                            <li>Be willing to negotiate reasonable offers.</li>
                            <li>Consider pricing slightly lower for a quick sale.</li>
                            <li>Mark items as "Free" if you just want them gone!</li>
                        </ul>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
                        <div className="bg-blue-50 w-12 h-12 flex items-center justify-center rounded-lg mb-4 text-primary-color">
                            <MessageCircle size={24} />
                        </div>
                        <h2 className="text-xl font-semibold text-text-primary mb-3">4. Communicate Promptly</h2>
                        <ul className="text-text-secondary space-y-2 text-sm list-disc pl-5">
                            <li>Respond to messages as quickly as you can.</li>
                            <li>Be polite and professional.</li>
                            <li>Clearly state your availability for meeting up.</li>
                            <li>Mark items as "Sold" immediately after the sale.</li>
                        </ul>
                    </div>
                </div>

                <div className="bg-blue-50 rounded-xl p-8 text-center">
                    <h2 className="text-2xl font-bold text-primary-color mb-4">Ready to start selling?</h2>
                    <p className="text-text-secondary mb-6 max-w-lg mx-auto">
                        Join our community of buyers and sellers today. It's free, decentralized, and built on the open web.
                    </p>
                    <Link href="/create-listing" className="inline-block bg-primary-color text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-light hover:text-white transition-colors shadow-sm">
                        Create Your First Listing
                    </Link>
                </div>
            </div>
        </div>
    );
}
