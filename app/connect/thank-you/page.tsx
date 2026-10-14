import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { BRAND } from '../brand';

export const metadata: Metadata = {
  title: { absolute: 'Thank you for connecting with Melisizwe' },
  robots: { index: false },
};

export default function ThankYouPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12"
      style={{ background: BRAND.mist, color: BRAND.ink, fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}>
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border bg-white text-center" style={{ borderColor: BRAND.line }}>
        <div className="flex h-1.5">
          <span className="flex-1" style={{ background: BRAND.red }} />
          <span className="flex-1" style={{ background: BRAND.blue }} />
          <span className="flex-1" style={{ background: BRAND.green }} />
        </div>
        <div className="px-6 py-10 sm:px-10">
          <Image src="/connect/melisizwe-logo.png" alt="Melisizwe" width={96} height={91} className="mx-auto" priority />
          <h1 className="mt-6 text-2xl font-extrabold uppercase leading-tight tracking-tight sm:text-3xl">
            Thank you for connecting with Melisizwe!
          </h1>
          <p className="mt-4 text-[17px] leading-relaxed" style={{ color: BRAND.inkMid }}>
            We look forward to exploring how we can create commercial value, develop talent and unlock potential together.
          </p>
          <p className="mt-3 text-sm" style={{ color: BRAND.inkMuted }}>
            A confirmation is on its way to your inbox.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <Link href="/connect#flywheel" className="rounded-xl px-5 py-3.5 text-sm font-bold text-white" style={{ background: BRAND.red }}>
              Explore the Melisizwe flywheel
            </Link>
            <a href="/connect/melisizwe-profile.jpg" target="_blank" className="rounded-xl border px-5 py-3.5 text-sm font-bold" style={{ borderColor: BRAND.ink }}>
              View our profile
            </a>
            <a href="https://www.melisizwe.co.za" className="rounded-xl border px-5 py-3.5 text-sm font-bold" style={{ borderColor: BRAND.line }}>
              Visit www.melisizwe.co.za
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
