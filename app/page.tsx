import Image from "next/image";
import { Navigation } from '@/components/Navigation'

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navigation />

      <section id="home" className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold">Welcome to Your App</h1>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Your awesome app description here</p>
        </div>
      </section>

      <section id="features" className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h2 className="text-3xl font-bold">Features</h2>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Your features description here</p>
        </div>
      </section>

      <section id="docs" className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-3xl font-bold">Documentation</h2>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Your documentation content here</p>
        </div>
      </section>

      <section id="pricing" className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h2 className="text-3xl font-bold">Pricing</h2>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Your pricing information here</p>
        </div>
      </section>
    </main>
  );
