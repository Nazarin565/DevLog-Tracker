import type { ReactNode } from 'react';
import './globals.css';
import { Providers } from './providers';

export const metadata = {
  title: 'DevLog',
  description: 'Task tracker with an agentic AI layer',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <Providers>
          <header className="bg-white border-b border-gray-200 px-6 py-3">
            <a href="/" className="text-lg font-semibold text-blue-600">DevLog</a>
          </header>
          <main className="max-w-4xl mx-auto px-6 py-8">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
