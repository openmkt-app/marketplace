'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

export default function MyStoreRedirect() {
    const { user, isLoggedIn, isLoading } = useAuth();
    const router = useRouter();
    const t = useTranslations('myStore');

    useEffect(() => {
        if (!isLoading) {
            if (isLoggedIn && user?.handle) {
                router.replace(`/store/${user.handle}`);
            } else if (!isLoggedIn) {
                // If not logged in, go to login page with a redirect back to here
                // Once they login, they will be redirected back to /my-store and then to their store
                router.replace('/login?redirect=/my-store');
            }
        }
    }, [isLoading, isLoggedIn, user, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <h1 className="text-xl font-bold text-slate-900">{t('redirecting')}</h1>
                <p className="text-slate-500 mt-2">{t('pleaseWait')}</p>
            </div>
        </div>
    );
}
