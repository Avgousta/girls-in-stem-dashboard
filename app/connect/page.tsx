import type { Metadata } from 'next';
import ConnectPage from './ConnectPage';

export const metadata: Metadata = {
  title: { absolute: 'Connect with Melisizwe — From Untapped Talent to Global Digital Delivery' },
  description:
    'Melisizwe is a South African social enterprise building an end-to-end talent and service delivery ecosystem for the digital economy.',
  openGraph: {
    title: 'From Untapped Talent to Global Digital Delivery.',
    description: 'Business · Talent · Impact — connect with Melisizwe.',
    images: ['/connect/melisizwe-profile.jpg'],
  },
};

export default function Page() {
  return <ConnectPage />;
}
