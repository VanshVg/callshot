import { ReactNode } from 'react';
import { Navbar } from './Navbar';

export const Layout = ({ children }: { children: ReactNode }) => (
  <div className="min-h-screen flex flex-col bg-[#111111]">
    <Navbar />
    <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-6">
      {children}
    </main>
  </div>
);
