'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navLinks = [
    { href: '/', label: 'NFT Market' },
    // { href: '/transactions', label: 'Transaction History' }, // Commented out until implemented
];

export function Navigation() {
    const pathname = usePathname();

    return (
        <nav className="bg-white border-b border-gray-200 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex space-x-8">
                        <div className="flex-shrink-0 flex items-center">
                            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 text-transparent bg-clip-text">NFT Market</span>
                        </div>
                        <Link
                            href="/"
                            className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${pathname === '/'
                                ? 'border-blue-500 text-gray-900'
                                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                }`}
                        >
                            NFT Market
                        </Link>
                        <Link
                            href="/tokenbank"
                            className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${pathname === '/tokenbank'
                                ? 'border-blue-500 text-gray-900'
                                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                }`}
                        >
                            Token Bank
                        </Link>

                        <Link
                            href="/nft-whitelist"
                            className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${pathname === '/nft-whitelist'
                                ? 'border-indigo-500 text-gray-900'
                                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                }`}
                        >
                            <span className="mr-1">🎫</span>
                            NFT Whitelist
                        </Link>
                        <Link
                            href="/airdrop-merkle-market"
                            className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${pathname === '/airdrop-merkle-market'
                                ? 'border-emerald-500 text-gray-900'
                                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                }`}
                        >
                            <span className="mr-1">🧬</span>
                            Airdrop Merkle
                        </Link>
                        <Link
                            href="/transfers"
                            className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${pathname === '/transfers'
                                ? 'border-blue-500 text-gray-900'
                                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                }`}
                        >
                            Transfer History
                        </Link>
                    </div>

                    <div className="flex items-center">

                        <appkit-button />
                    </div>
                </div>
            </div>
        </nav>
    );
}
