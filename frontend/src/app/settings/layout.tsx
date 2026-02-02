import { Header } from '@/components/layout/header';
import { MobileNav } from '@/components/layout/mobile-nav';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background pb-mobile-nav">
      <Header />
      {children}
      <MobileNav />
    </div>
  );
}
