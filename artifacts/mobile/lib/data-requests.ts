import { router } from 'expo-router';
import { translateUi, type AppLanguage } from '@/lib/strings';

const dataRequestCopy = {
  access: {
    subject: 'Personal data access request',
    body: 'Please treat this support ticket as a request to access my personal data. I understand OG Exports Support may need to verify my identity and confirm what actions are available.',
  },
  correction: {
    subject: 'Personal data correction request',
    body: 'Please treat this support ticket as a request to have my personal data corrected. I understand OG Exports Support may need to verify my identity and confirm what actions are available.',
  },
  deletion: {
    subject: 'OG Exports account and data deletion request',
    body: 'I am requesting deletion of my OG Exports account and associated personal data. Please verify my account ownership and review any active investments and legal or regulatory retention requirements. Please delete or anonymize data that is eligible for removal. I understand this request does not delete my account immediately, and records required for legal or contractual purposes may need to be retained. Please let me know the outcome of your review.',
  },
} as const;

export function openDataRequest(kind: keyof typeof dataRequestCopy, language: AppLanguage) {
  const copy = dataRequestCopy[kind];
  router.push({
    pathname: '/account/messages',
    params: {
      mode: 'tickets',
      subject: translateUi(copy.subject, language),
      body: translateUi(copy.body, language),
    },
  } as never);
}
