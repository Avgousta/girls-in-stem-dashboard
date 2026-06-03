import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Girls in STEM — Recruitment Platform',
  description: 'Melisizwe Programme — Candidate Management System',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ background: 'var(--bg)' }}>
        {children}
      </body>
    </html>
  )
}
