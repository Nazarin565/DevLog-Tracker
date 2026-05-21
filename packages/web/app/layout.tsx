import type { ReactNode } from 'react';

export const metadata = {
  title: 'DevLog',
  description: 'Task tracker with an agentic AI layer',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
