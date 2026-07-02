import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { Fraunces } from 'next/font/google';
import './globals.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
});

// Swap these for the subject of the story.
const SITE_TITLE = '{{YOUR NAME}}';
const SITE_DESCRIPTION =
  'The story of {{YOUR NAME}}, narrated by {{NARRATOR NAME}}, their AI.';

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${GeistSans.className} ${fraunces.variable}`}>
        {children}
      </body>
    </html>
  );
}
