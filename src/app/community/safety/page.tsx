import Link from 'next/link';
import { ShieldCheck, MapPin, Users, AlertTriangle } from 'lucide-react';

export default function SafetyTipsPage() {
    return (
        <div className="container-custom py-12">
            <div className="max-w-3xl mx-auto">
                <div className="mb-8">
                    <Link href="/" className="text-text-secondary hover:text-primary-color text-sm mb-4 inline-block">
                        ← Back to Home
                    </Link>
                    <h1 className="text-3xl font-bold text-primary-color mb-4">Safety Tips</h1>
                    <p className="text-text-secondary text-lg">
                        At Open Market, your safety is our top priority. While most transactions go smoothly, it's important to stay vigilant. Here are some guidelines to help you buy and sell safely.
                    </p>
                </div>

                <div className="space-y-8">
                    <section className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
                        <div className="flex items-start">
                            <div className="bg-blue-50 p-3 rounded-full mr-4 text-primary-color">
                                <MapPin size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-text-primary mb-2">1. Meet in a Public Place</h2>
                                <p className="text-text-secondary">
                                    Always arrange to meet in a busy, public location like a coffee shop, shopping mall, or police station "safe exchange zone". Avoid meeting at your home or a secluded area, especially for high-value items.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
                        <div className="flex items-start">
                            <div className="bg-blue-50 p-3 rounded-full mr-4 text-primary-color">
                                <Users size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-text-primary mb-2">2. Bring a Friend</h2>
                                <p className="text-text-secondary">
                                    If possible, bring a friend or family member with you to the exchange. There is safety in numbers. If you must go alone, let someone know where you are going and who you are meeting.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
                        <div className="flex items-start">
                            <div className="bg-blue-50 p-3 rounded-full mr-4 text-primary-color">
                                <ShieldCheck size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-text-primary mb-2">3. Inspect Before You Pay</h2>
                                <p className="text-text-secondary">
                                    Examine the item thoroughly before handing over any money. Ensure it matches the description and works as expected. Don't be pressured into a quick sale.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
                        <div className="flex items-start">
                            <div className="bg-yellow-50 p-3 rounded-full mr-4 text-yellow-600">
                                <ShieldCheck size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-text-primary mb-2">4. Check Their Reputation</h2>
                                <p className="text-text-secondary">
                                    Unlike other platforms, Open Market connects you to real Bluesky profiles. Click the seller's handle to see their activity. Do they have followers? Have they been active for a while? Reputation is your best safety tool.
                                </p>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="mt-12 p-6 bg-neutral-50 rounded-lg text-center">
                    <h3 className="text-lg font-semibold text-text-primary mb-2">See something suspicious?</h3>
                    <p className="text-text-secondary mb-4">
                        If you encounter a suspicious listing or user, please report it to us immediately using the "Report Listing" feature or contacting us directly.
                    </p>
                    <a
                        href="mailto:support@openmkt.app?subject=Safety Report: [Issue Title]"
                        className="inline-block bg-white text-primary-color border border-neutral-light px-6 py-2 rounded-lg font-medium hover:bg-neutral-50 transition-colors"
                    >
                        Report an Issue
                    </a>
                </div>
            </div>
        </div>
    );
}
