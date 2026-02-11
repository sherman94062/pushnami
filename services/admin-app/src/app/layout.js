import './globals.css';
import Sidebar from '../components/Sidebar';

export const metadata = {
  title: 'Admin Dashboard',
  description: 'Landing page admin dashboard',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="admin-layout">
          <Sidebar />
          <main className="main-content">{children}</main>
        </div>
      </body>
    </html>
  );
}
