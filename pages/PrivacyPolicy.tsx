const PrivacyPolicy = () => {
  return (
    <div className="relative min-h-screen bg-[#f8fafc] overflow-hidden">
      {/* Background glow (same style as FAQ & Orders) */}
      <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-indigo-400/20 rounded-full blur-[180px]" />
      <div className="absolute top-[300px] right-[-200px] w-[600px] h-[600px] bg-sky-300/20 rounded-full blur-[160px]" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 pt-24 pb-20">
        {/* Page Title */}
        <h1 className="text-4xl font-extrabold mb-6">
          Privacy Policy
        </h1>

        <p className="text-slate-600 mb-10">
          At StickToon, we value your privacy and are committed to protecting
          your personal information. This Privacy Policy explains how we
          collect, use, and safeguard your data.
        </p>

        <div className="space-y-8 text-slate-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold mb-2">
              1. Information We Collect
            </h2>
            <p>
              We collect information such as your name, email address, phone
              number, shipping address, and order details when you place an
              order, contact us, or create an account on StickToon.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">
              2. Automatically Collected Information
            </h2>
            <p>
              When you visit our website, we may automatically collect certain
              information including your IP address, browser type, device
              details, and cookies to improve website performance and user
              experience.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">
              3. How We Use Your Information
            </h2>
            <p>
              Your information is used to process orders, deliver products,
              provide customer support, send order updates, and improve our
              services. Promotional communication is optional and can be
              opted out of at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">
              4. Payments
            </h2>
            <p>
              StickToon currently supports <b>Cash on Delivery (COD)</b> only.
              We do not collect or store any card, UPI, or banking details.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">
              5. Data Sharing
            </h2>
            <p>
              We may share your information with trusted delivery partners and
              internal team members strictly for order fulfillment and
              operational purposes. We do not sell your personal data to
              third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">
              6. Data Security
            </h2>
            <p>
              We take reasonable technical and organizational measures to
              protect your data. However, no online platform can guarantee
              complete security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">
              7. Your Rights
            </h2>
            <p>
              You may request to review, update, or delete your personal
              information by contacting us. Withdrawal of consent may limit
              access to certain services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">
              8. Changes to This Policy
            </h2>
            <p>
              This Privacy Policy may be updated from time to time. Any changes
              will be reflected on this page. Continued use of the website
              implies acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">
              9. Contact Us
            </h2>
            <p>
              For any questions or concerns regarding this Privacy Policy,
              please contact us at:
              <br />
              <b>sticktoon.xyz@gmail.com</b>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
