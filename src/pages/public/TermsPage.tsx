// Task 87.1: Terms of Service page — public route, no auth required

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const TermsPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-start justify-center p-6">
      <Card className="bg-white border-0 shadow-md rounded-xl max-w-3xl w-full">
        <CardHeader>
          <CardTitle className="text-2xl font-bold tracking-tight">Terms of Service</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-gray-700 space-y-4">
          <p className="text-xs text-gray-500">Last updated: January 1, 2026</p>

          <h2 className="text-lg font-bold tracking-tight">1. Acceptance of Terms</h2>
          <p>
            By accessing or using the Edeviser platform, you agree to be bound by these Terms of
            Service. If you do not agree, you may not use the platform.
          </p>

          <h2 className="text-lg font-bold tracking-tight">2. Description of Service</h2>
          <p>
            Edeviser is an outcome-based education management platform that provides tools for
            learning management, assessment, gamification, and accreditation support.
          </p>

          <h2 className="text-lg font-bold tracking-tight">3. User Accounts</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials.
            You must notify us immediately of any unauthorized use of your account.
          </p>

          <h2 className="text-lg font-bold tracking-tight">4. Acceptable Use</h2>
          <p>
            You agree not to misuse the platform, including but not limited to: attempting to
            gain unauthorized access, interfering with other users, or uploading malicious content.
          </p>

          <h2 className="text-lg font-bold tracking-tight">5. Intellectual Property</h2>
          <p>
            Content you create on the platform remains yours. Edeviser retains rights to the
            platform software, design, and branding.
          </p>

          <h2 className="text-lg font-bold tracking-tight">6. Limitation of Liability</h2>
          <p>
            Edeviser is provided &quot;as is&quot; without warranties of any kind. We are not liable for
            any indirect, incidental, or consequential damages arising from your use of the platform.
          </p>

          <h2 className="text-lg font-bold tracking-tight">7. Changes to Terms</h2>
          <p>
            We may update these terms from time to time. Continued use of the platform after
            changes constitutes acceptance of the updated terms.
          </p>

          <h2 className="text-lg font-bold tracking-tight">8. Contact</h2>
          <p>
            For questions about these terms, contact us at{' '}
            <a href="mailto:legal@edeviser.com" className="text-blue-600 underline">
              legal@edeviser.com
            </a>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default TermsPage;
