// Task 87.1: Privacy Policy page — public route, no auth required

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PrivacyPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-start justify-center p-6">
      <Card className="bg-white border-0 shadow-md rounded-xl max-w-3xl w-full">
        <CardHeader>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Privacy Policy
          </CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-gray-700 space-y-4">
          <p className="text-xs text-gray-500">Last updated: January 1, 2026</p>

          <h2 className="text-lg font-bold tracking-tight">
            1. Information We Collect
          </h2>
          <p>
            We collect information you provide directly (name, email,
            institution) and usage data (page views, feature interactions) to
            improve the platform experience.
          </p>

          <h2 className="text-lg font-bold tracking-tight">
            2. How We Use Your Information
          </h2>
          <p>
            Your data is used to provide and improve the Edeviser platform,
            personalize your learning experience, generate analytics for
            educators, and support accreditation processes.
          </p>

          <h2 className="text-lg font-bold tracking-tight">3. Cookies</h2>
          <p>
            We use essential cookies for authentication and session management.
            Analytics cookies are only enabled with your explicit consent via
            the cookie consent banner.
          </p>

          <h2 className="text-lg font-bold tracking-tight">4. Data Sharing</h2>
          <p>
            We do not sell your personal data. Data may be shared with your
            institution&apos;s administrators and educators as required for
            educational purposes.
          </p>

          <h2 className="text-lg font-bold tracking-tight">
            5. Data Retention
          </h2>
          <p>
            Your data is retained for the duration of your account. Upon account
            deletion, personal data is removed within 30 days. Anonymized
            analytics data may be retained.
          </p>

          <h2 className="text-lg font-bold tracking-tight">6. Your Rights</h2>
          <p>
            You have the right to access, correct, or delete your personal data.
            You can export your data at any time from your profile settings.
          </p>

          <h2 className="text-lg font-bold tracking-tight">7. Security</h2>
          <p>
            We implement industry-standard security measures including
            encryption in transit, row-level security, and regular security
            audits.
          </p>

          <h2 className="text-lg font-bold tracking-tight">8. Contact</h2>
          <p>
            For privacy-related inquiries, contact us at{" "}
            <a
              href="mailto:privacy@edeviser.com"
              className="text-blue-600 underline"
            >
              privacy@edeviser.com
            </a>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrivacyPage;
