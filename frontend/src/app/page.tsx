import BuyingSection from '@/components/BuyingSection'
import ConnectButton from '@/components/ConnectButton'
import ListingSection from '@/components/ListingSection'

export default function Home() {
  return (
    <div className="min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <header className="flex justify-between items-center mb-12">
        <h1 className="text-4xl font-bold">NFT Market</h1>
        <ConnectButton />
      </header>

      <main className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <ListingSection />
        <BuyingSection />
      </main>

      <footer className="mt-20 text-center text-gray-500">
        <p>Built with Next.js, Wagmi, and AppKit</p>
      </footer>
    </div>
  );
}
