import './globals.css';

export const metadata = {
  title: 'Pushnami — Grow Your Audience',
  description: 'The all-in-one platform to reach, engage, and convert your visitors.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
