const TermsConditions = () => {
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

      <div className="relative z-10 max-w-4xl mx-auto px-6 pt-24 pb-20">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 px-6 py-3 rounded-full mb-4 border-2 border-yellow-500/30">
            <span className="text-[11px] font-black text-yellow-700 uppercase tracking-widest">Legal</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-slate-900 via-yellow-700 to-orange-700 bg-clip-text text-transparent mb-2">
            Terms & Conditions
          </h1>
          <p className="text-slate-600 text-sm md:text-base max-w-2xl mx-auto">
            Please read these terms carefully before using our services.
          </p>
        </div>

        <div className="space-y-6">
          <section className="bg-gradient-to-br from-white to-yellow-50/50 backdrop-blur border-2 border-yellow-500/20 rounded-2xl shadow-sm hover:shadow-2xl hover:shadow-yellow-500/20 hover:border-yellow-500/60 transition-all duration-300 p-6">
            <h2 className="text-xl font-bold mb-3 text-slate-900">1. Acceptance of Terms</h2>
            <p className="text-slate-700 leading-relaxed">
              By accessing or using the StickToon website, you agree to be bound
              by these Terms & Conditions. If you do not agree, please do not
              use the website.
            </p>
          </section>

          <section className="bg-gradient-to-br from-white to-yellow-50/50 backdrop-blur border-2 border-yellow-500/20 rounded-2xl shadow-sm hover:shadow-2xl hover:shadow-yellow-500/20 hover:border-yellow-500/60 transition-all duration-300 p-6">
            <h2 className="text-xl font-bold mb-3 text-slate-900">2. Products & Services</h2>
            <p className="text-slate-700 leading-relaxed">
              StickToon offers custom and ready-made badges. Product images are
              for representation purposes and may slightly vary from the final
              product.
            </p>
          </section>

          <section className="bg-gradient-to-br from-white to-yellow-50/50 backdrop-blur border-2 border-yellow-500/20 rounded-2xl shadow-sm hover:shadow-2xl hover:shadow-yellow-500/20 hover:border-yellow-500/60 transition-all duration-300 p-6">
            <h2 className="text-xl font-bold mb-3 text-slate-900">3. Orders & Payments</h2>
            <p className="text-slate-700 leading-relaxed">
              All orders are subject to availability and confirmation. Payments
              are currently accepted via Cash on Delivery (COD) only.
            </p>
          </section>

          <section className="bg-gradient-to-br from-white to-yellow-50/50 backdrop-blur border-2 border-yellow-500/20 rounded-2xl shadow-sm hover:shadow-2xl hover:shadow-yellow-500/20 hover:border-yellow-500/60 transition-all duration-300 p-6">
            <h2 className="text-xl font-bold mb-3 text-slate-900">4. User Responsibilities</h2>
            <p className="text-slate-700 leading-relaxed">
              You agree to provide accurate and complete information while
              placing orders and using our services.
            </p>
          </section>

          <section className="bg-gradient-to-br from-white to-yellow-50/50 backdrop-blur border-2 border-yellow-500/20 rounded-2xl shadow-sm hover:shadow-2xl hover:shadow-yellow-500/20 hover:border-yellow-500/60 transition-all duration-300 p-6">
            <h2 className="text-xl font-bold mb-3 text-slate-900">5. Limitation of Liability</h2>
            <p className="text-slate-700 leading-relaxed">
              StickToon shall not be liable for any indirect or consequential
              damages arising from the use of our website or products.
            </p>
          </section>

          <section className="bg-gradient-to-br from-white to-yellow-50/50 backdrop-blur border-2 border-yellow-500/20 rounded-2xl shadow-sm hover:shadow-2xl hover:shadow-yellow-500/20 hover:border-yellow-500/60 transition-all duration-300 p-6">
            <h2 className="text-xl font-bold mb-3 text-slate-900">6. Changes to Terms</h2>
            <p className="text-slate-700 leading-relaxed">
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
