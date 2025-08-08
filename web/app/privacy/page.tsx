export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
        
        <div className="bg-white rounded-lg shadow-sm p-8 space-y-6">
          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">1. Information We Collect</h2>
            <p className="text-gray-600 leading-relaxed mb-3">
              We collect information you provide directly to us, including:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>Account information (email, username, age, demographics)</li>
              <li>Trend submissions and validation data</li>
              <li>Payment information (Venmo username for payouts)</li>
              <li>Usage data and analytics</li>
              <li>Communications with us</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">2. How We Use Your Information</h2>
            <p className="text-gray-600 leading-relaxed mb-3">
              We use the information we collect to:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>Provide and improve our services</li>
              <li>Process payments and earnings</li>
              <li>Send notifications about your account</li>
              <li>Analyze trends and user behavior</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">3. Information Sharing</h2>
            <p className="text-gray-600 leading-relaxed">
              We do not sell or rent your personal information. We may share your information with:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4 mt-3">
              <li>Service providers who assist in our operations</li>
              <li>Enterprise clients (aggregated and anonymized data only)</li>
              <li>Law enforcement when required by law</li>
              <li>In connection with a merger or acquisition</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">4. Data Security</h2>
            <p className="text-gray-600 leading-relaxed">
              We implement appropriate technical and organizational measures to protect your 
              personal information against unauthorized access, alteration, disclosure, or destruction.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">5. Your Rights (GDPR/CCPA)</h2>
            <p className="text-gray-600 leading-relaxed mb-3">
              Depending on your location, you may have the right to:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>Access your personal information</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to data processing</li>
              <li>Data portability</li>
              <li>Withdraw consent</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">6. Cookies and Tracking</h2>
            <p className="text-gray-600 leading-relaxed">
              We use cookies and similar tracking technologies to collect usage information, 
              analyze trends, and deliver personalized content. You can control cookies through 
              your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">7. Children's Privacy</h2>
            <p className="text-gray-600 leading-relaxed">
              WaveSight is not intended for users under 18 years of age. We do not knowingly 
              collect personal information from children under 18.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">8. Data Retention</h2>
            <p className="text-gray-600 leading-relaxed">
              We retain your information for as long as necessary to provide our services and 
              comply with legal obligations. You may request deletion of your account at any time.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">9. International Data Transfers</h2>
            <p className="text-gray-600 leading-relaxed">
              Your information may be transferred to and processed in countries other than your 
              country of residence. We ensure appropriate safeguards are in place for such transfers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">10. Changes to This Policy</h2>
            <p className="text-gray-600 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any 
              material changes by email or through the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">11. Contact Us</h2>
            <p className="text-gray-600 leading-relaxed">
              For privacy-related questions or to exercise your rights, contact us at:
            </p>
            <p className="text-gray-600 mt-2">
              Email: privacy@wavesight.com<br />
              Data Protection Officer: dpo@wavesight.com
            </p>
          </section>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}