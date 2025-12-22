'use client'

import BuyingSection from '@/components/BuyingSection'
import ListingSection from '@/components/ListingSection'

export default function Home() {
  return (
    <div className="space-y-8">
      {/* Header Info */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">NFT Market</h1>
        <p className="text-gray-600">Trade NFTs using ERC20 tokens with ease.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Seller Area */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              🛍️ Seller Dashboard
            </h2>
            <p className="text-sm text-gray-500 mt-1">Mint and list your NFTs for sale</p>
          </div>
          <ListingSection />
        </div>

        {/* Buyer Area */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              💰 Buyer Dashboard
            </h2>
            <p className="text-sm text-gray-500 mt-1">Get tokens and purchase NFTs</p>
          </div>
          <BuyingSection />
        </div>
      </div>

      {/* Features Info from Reference Project */}
      <div className="mt-8 bg-blue-50 rounded-lg p-6 border border-blue-100">
        <h3 className="text-xl font-bold text-gray-900 mb-4">How It Works</h3>
        <ul className="space-y-2 text-gray-700">
          <li className="flex items-start">
            <span className="text-blue-600 mr-2">•</span>
            <span><strong>List NFT:</strong> Seller mints an NFT, approves the market, and lists it for a specific price.</span>
          </li>
          <li className="flex items-start">
            <span className="text-blue-600 mr-2">•</span>
            <span><strong>Buy NFT:</strong> Buyer mints test ERC20 tokens, approves the market, and buys the listed NFT.</span>
          </li>
          <li className="flex items-start">
            <span className="text-blue-600 mr-2">•</span>
            <span><strong>Secure:</strong> All transactions are handled securely via smart contracts on Sepolia.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
