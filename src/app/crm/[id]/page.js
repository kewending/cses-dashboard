import { getContactById } from '../serverActions';
import { notFound } from 'next/navigation';
import CrmContactDetail from '@/components/CrmContactDetail';

export async function generateMetadata({ params }) {
  const { id } = await params;
  const contact = await getContactById(id);
  if (!contact) return { title: 'Contact Not Found | Life OS' };
  const name = contact.chineseName ? `${contact.chineseName} (${contact.fullName})` : contact.fullName;
  return {
    title: `${name} | Network CRM | Life OS`,
    description: `Contact profile for ${contact.fullName}`,
  };
}

export default async function ContactDetailPage({ params }) {
  const { id } = await params;
  const contact = await getContactById(id);
  if (!contact) notFound();
  return <CrmContactDetail initialContact={contact} />;
}
