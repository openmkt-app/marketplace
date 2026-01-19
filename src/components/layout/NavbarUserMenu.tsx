'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { generateAvatarUrl } from '@/lib/image-utils';
import { LogOut, LayoutGrid, Store, Settings } from 'lucide-react';

interface NavbarUserMenuProps {
    user: {
        did: string;
        handle: string;
        displayName?: string;
        avatarCid?: string;
    };
    onLogout: () => void;
}

export default function NavbarUserMenu({ user, onLogout }: NavbarUserMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div className="relative" ref={menuRef}>
            {/* Avatar Trigger */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 focus:outline-none"
                aria-expanded={isOpen}
                aria-haspopup="true"
            >
                {user.did && user.avatarCid ? (
                    <div className={`h-9 w-9 rounded-full border-2 overflow-hidden transition-all relative ${isOpen ? 'ring-2 ring-primary-color border-primary-color' : 'border-gray-100 hover:ring-2 hover:ring-primary-color'}`}>
                        <Image
                            src={generateAvatarUrl(user.did, user.avatarCid) || ''}
                            alt={user.displayName || user.handle || 'User'}
                            fill
                            className="object-cover"
                            unoptimized
                        />
                    </div>
                ) : (
                    <div className={`h-9 w-9 rounded-full bg-blue-100 border-2 overflow-hidden transition-all flex items-center justify-center text-blue-600 font-semibold ${isOpen ? 'ring-2 ring-primary-color border-primary-color' : 'border-gray-100 hover:ring-2 hover:ring-primary-color'}`}>
                        {user.handle ? user.handle.charAt(0).toUpperCase() : 'U'}
                    </div>
                )}
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-100 origin-top-right">

                    {/* User Info Header */}
                    <div className="px-4 py-3 border-b border-gray-50">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                            {user.displayName || user.handle}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                            {user.handle}
                        </p>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                        <Link
                            href={`/store/${user.handle}`}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-color transition-colors"
                            onClick={() => setIsOpen(false)}
                        >
                            <Store size={16} />
                            My Store
                        </Link>
                        <Link
                            href="/my-listings"
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-color transition-colors"
                            onClick={() => setIsOpen(false)}
                        >
                            <LayoutGrid size={16} />
                            Manage Listings
                        </Link>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-50 my-1"></div>

                    {/* Logout */}
                    <div className="py-1">
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                onLogout();
                            }}
                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                            <LogOut size={16} />
                            Log Out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
