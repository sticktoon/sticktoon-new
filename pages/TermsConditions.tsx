const TermsConditions = () => {
  return (
    <div className="relative min-h-screen bg-[#f8fafc] overflow-hidden">
      {/* Glow background */}
      <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-indigo-400/20 rounded-full blur-[180px]" />
      <div className="absolute top-[300px] right-[-200px] w-[600px] h-[600px] bg-sky-300/20 rounded-full blur-[160px]" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 pt-24 pb-20">
        <h1 className="text-4xl font-extrabold mb-6">
          Terms & Conditions
        </h1>

        <div className="space-y-8 text-slate-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold mb-2">1. Acceptance of Terms</h2>
            <p>
              By accessing or using the StickToon website, you agree to be bound
              by these Terms & Conditions. If you do not agree, please do not
              use the website.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">2. Products & Services</h2>
            <p>
              StickToon offers custom and ready-made badges. Product images are
              for representation purposes and may slightly vary from the final
              product.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">3. Orders & Payments</h2>
            <p>
              All orders are subject to availability and confirmation. Payments
              are currently accepted via Cash on Delivery (COD) only.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">4. User Responsibilities</h2>
            <p>
              You agree to provide accurate and complete information while
              placing orders and using our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">5. Limitation of Liability</h2>
            <p>
              StickToon shall not be liable for any indirect or consequential
              damages arising from the use of our website or products.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">6. Changes to Terms</h2>
            <p>
              StickToon reserves the right to modify these Terms & Conditions at
              any time without prior notice.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsConditions;
