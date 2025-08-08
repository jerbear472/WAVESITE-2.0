export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Terms of Service</h1>
        
        <div className="bg-white rounded-lg shadow-sm p-8 space-y-6">
          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">1. Acceptance of Terms</h2>
            <p className="text-gray-600 leading-relaxed">
              By accessing and using WaveSight, you agree to be bound by these Terms of Service. 
              If you do not agree to these terms, please do not use our service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">2. User Eligibility</h2>
            <p className="text-gray-600 leading-relaxed">
              You must be at least 18 years old to use WaveSight. By using our service, you represent 
              and warrant that you meet this age requirement.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">3. User Accounts</h2>
            <p className="text-gray-600 leading-relaxed">
              You are responsible for maintaining the confidentiality of your account credentials and 
              for all activities that occur under your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">4. Content Submission</h2>
            <p className="text-gray-600 leading-relaxed mb-3">
              When submitting trends to WaveSight, you agree that:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>Your submissions are accurate and truthful</li>
              <li>You have the right to share the content</li>
              <li>The content does not violate any third-party rights</li>
              <li>The content is not harmful, offensive, or illegal</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">5. Earnings and Payments</h2>
            <p className="text-gray-600 leading-relaxed">
              Earnings are subject to validation and approval. WaveSight reserves the right to 
              withhold payment for fraudulent or low-quality submissions. Minimum cashout amount 
              is $5.00. Users earning over $600 annually will receive appropriate tax documentation.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">6. Prohibited Activities</h2>
            <p className="text-gray-600 leading-relaxed mb-3">You agree not to:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>Submit false or misleading information</li>
              <li>Use automated systems to submit trends</li>
              <li>Violate any applicable laws or regulations</li>
              <li>Harass or harm other users</li>
              <li>Attempt to manipulate the validation system</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">7. Intellectual Property</h2>
            <p className="text-gray-600 leading-relaxed">
              By submitting content to WaveSight, you grant us a non-exclusive, worldwide, 
              royalty-free license to use, display, and distribute your submissions for 
              business purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">8. Limitation of Liability</h2>
            <p className="text-gray-600 leading-relaxed">
              WaveSight is provided "as is" without warranties of any kind. We are not liable 
              for any indirect, incidental, or consequential damages arising from your use of 
              the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">9. Changes to Terms</h2>
            <p className="text-gray-600 leading-relaxed">
              We reserve the right to modify these terms at any time. Continued use of the 
              service after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">10. Contact Information</h2>
            <p className="text-gray-600 leading-relaxed">
              For questions about these Terms of Service, please contact us at legal@wavesight.com
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