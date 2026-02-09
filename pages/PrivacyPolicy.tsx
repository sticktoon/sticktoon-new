const PrivacyPolicy = () => {
  return (
    <div className="relative min-h-screen bg-white overflow-hidden">
      {/* Premium background glow - Hot Drops Theme */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-64 left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-yellow-500/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 right-[-300px] w-[600px] h-[600px] bg-orange-400/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-[-200px] w-[500px] h-[500px] bg-red-400/10 rounded-full blur-[100px]" />
      </div>

      {/* Funny Floating Circles - Outer Edges Only */}
      <div className="absolute top-32 -left-8 w-24 h-24 rounded-full border-[8px] border-yellow-400/30 animate-bounce" style={{ animationDuration: '4s' }} />
      <div className="absolute top-64 -right-12 w-32 h-32 rounded-full border-[10px] border-orange-400/25 animate-pulse" style={{ animationDuration: '3s' }} />
      <div className="absolute bottom-40 -left-16 w-28 h-28 rounded-full border-[8px] border-red-400/20 animate-bounce" style={{ animationDuration: '5s', animationDelay: '1s' }} />
      <div className="absolute bottom-72 -right-8 w-20 h-20 rounded-full border-[6px] border-yellow-500/35 animate-pulse" style={{ animationDuration: '3.5s', animationDelay: '0.5s' }} />

      <div className="relative z-10 max-w-4xl mx-auto px-6 pt-8 pb-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 px-4 py-1.5 rounded-full mb-3 border-2 border-yellow-500/30">
            <span className="text-[10px] font-black text-yellow-700 uppercase tracking-widest">Legal</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight bg-gradient-to-r from-slate-900 via-yellow-700 to-orange-700 bg-clip-text text-transparent mb-2">
            Privacy Policy
          </h1>
          <p className="text-slate-600 text-xs md:text-sm max-w-2xl mx-auto">
            At StickToon, we value your privacy and are committed to protecting your personal information.
          </p>
        </div>

        <div className="space-y-3">
          <section className="bg-gradient-to-br from-white to-yellow-50/50 backdrop-blur border-2 border-yellow-500/20 rounded-xl shadow-sm hover:shadow-xl hover:shadow-yellow-500/20 hover:border-yellow-500/60 transition-all duration-300 p-4">
            <h2 className="text-base font-bold mb-2 text-slate-900">
              1. Information We Collect
            </h2>
            <p className="text-slate-700 text-sm leading-snug">
              We collect information such as your name, email address, phone
              number, shipping address, and order details when you place an
              order, contact us, or create an account on StickToon.
            </p>
          </section>

          <section className="bg-gradient-to-br from-white to-yellow-50/50 backdrop-blur border-2 border-yellow-500/20 rounded-xl shadow-sm hover:shadow-xl hover:shadow-yellow-500/20 hover:border-yellow-500/60 transition-all duration-300 p-4">
            <h2 className="text-base font-bold mb-2 text-slate-900">
              2. Automatically Collected Information
            </h2>
            <p className="text-slate-700 text-sm leading-snug">
              When you visit our website, we may automatically collect certain
              information including your IP address, browser type, device
              details, and cookies to improve website performance and user
              experience.
            </p>
          </section>

          <section className="bg-gradient-to-br from-white to-yellow-50/50 backdrop-blur border-2 border-yellow-500/20 rounded-xl shadow-sm hover:shadow-xl hover:shadow-yellow-500/20 hover:border-yellow-500/60 transition-all duration-300 p-4">
            <h2 className="text-base font-bold mb-2 text-slate-900">
              3. How We Use Your Information
            </h2>
            <p className="text-slate-700 text-sm leading-snug">
              Your information is used to process orders, deliver products,
              provide customer support, send order updates, and improve our
              services. Promotional communication is optional and can be
              opted out of at any time.
            </p>
          </section>

          <section className="bg-gradient-to-br from-white to-yellow-50/50 backdrop-blur border-2 border-yellow-500/20 rounded-xl shadow-sm hover:shadow-xl hover:shadow-yellow-500/20 hover:border-yellow-500/60 transition-all duration-300 p-4">
            <h2 className="text-base font-bold mb-2 text-slate-900">
              4. Payments
            </h2>
            <p className="text-slate-700 text-sm leading-snug">
              StickToon currently supports <b>Cash on Delivery (COD)</b> only.
              We do not collect or store any card, UPI, or banking details.
            </p>
          </section>

          <section className="bg-gradient-to-br from-white to-yellow-50/50 backdrop-blur border-2 border-yellow-500/20 rounded-xl shadow-sm hover:shadow-xl hover:shadow-yellow-500/20 hover:border-yellow-500/60 transition-all duration-300 p-4">
            <h2 className="text-base font-bold mb-2 text-slate-900">
              5. Data Sharing
            </h2>
            <p className="text-slate-700 text-sm leading-snug">
              We may share your information with trusted delivery partners and
              internal team members strictly for order fulfillment and
              operational purposes. We do not sell your personal data to
              third parties.
            </p>
          </section>

          <section className="bg-gradient-to-br from-white to-yellow-50/50 backdrop-blur border-2 border-yellow-500/20 rounded-xl shadow-sm hover:shadow-xl hover:shadow-yellow-500/20 hover:border-yellow-500/60 transition-all duration-300 p-4">
            <h2 className="text-base font-bold mb-2 text-slate-900">
              6. Data Security
            </h2>
            <p className="text-slate-700 text-sm leading-snug">
              We take reasonable technical and organizational measures to
              protect your data. However, no online platform can guarantee
              complete security.
            </p>
          </section>

          <section className="bg-gradient-to-br from-white to-yellow-50/50 backdrop-blur border-2 border-yellow-500/20 rounded-xl shadow-sm hover:shadow-xl hover:shadow-yellow-500/20 hover:border-yellow-500/60 transition-all duration-300 p-4">
            <h2 className="text-base font-bold mb-2 text-slate-900">
              7. Your Rights
            </h2>
            <p className="text-slate-700 text-sm leading-snug">
              You may request to review, update, or delete your personal
              information by contacting us. Withdrawal of consent may limit
              access to certain services.
            </p>
          </section>

          <section className="bg-gradient-to-br from-white to-yellow-50/50 backdrop-blur border-2 border-yellow-500/20 rounded-xl shadow-sm hover:shadow-xl hover:shadow-yellow-500/20 hover:border-yellow-500/60 transition-all duration-300 p-4">
            <h2 className="text-base font-bold mb-2 text-slate-900">
              8. Changes to This Policy
            </h2>
            <p className="text-slate-700 text-sm leading-snug">
              This Privacy Policy may be updated from time to time. Any changes
              will be reflected on this page. Continued use of the website
              implies acceptance of the updated policy.
            </p>
          </section>

          <section className="bg-gradient-to-br from-white to-yellow-50/50 backdrop-blur border-2 border-yellow-500/20 rounded-xl shadow-sm hover:shadow-xl hover:shadow-yellow-500/20 hover:border-yellow-500/60 transition-all duration-300 p-4">
            <h2 className="text-base font-bold mb-2 text-slate-900">
              9. Contact Us
            </h2>
            <p className="text-slate-700 text-sm leading-snug">
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
