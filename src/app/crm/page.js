import { getContacts } from './serverActions';
import CrmDirectory from '@/components/CrmDirectory';

export const metadata = {
  title: 'Network CRM | Life OS',
  description: 'Personal Relationship Manager — manage your contacts, tiers, and network.',
};

export default async function CrmPage() {
  const contacts = await getContacts();
  return <CrmDirectory initialContacts={contacts} />;
}
