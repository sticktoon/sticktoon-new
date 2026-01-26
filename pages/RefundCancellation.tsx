const RefundCancellation = () => {
  return (
    <div className="relative min-h-screen bg-[#f8fafc] overflow-hidden">
      {/* Glow background */}
      <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-indigo-400/20 rounded-full blur-[180px]" />
      <div className="absolute top-[300px] right-[-200px] w-[600px] h-[600px] bg-sky-300/20 rounded-full blur-[160px]" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 pt-24 pb-20">
        <h1 className="text-4xl font-extrabold mb-6">
          Refund & Cancellation Policy
        </h1>

        <div className="space-y-8 text-slate-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold mb-2">1. Order Cancellation</h2>
            <p>
              Orders can be cancelled only before they are processed or shipped.
              Once dispatched, cancellation requests will not be accepted.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">2. Refund Eligibility</h2>
            <p>
              Refunds are applicable only in cases of 
              incorrect products delivered to you.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">3. Refund Process</h2>
            <p>
              Once your refund request is approved, the refund will be processed
              through the original payment method or via a suitable alternative.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">4. Non-Refundable Items</h2>
            <p>
              Customized or personalized badges are non-refundable unless
              received in a damaged or defective condition.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">5. Contact for Refunds</h2>
            <p>
              For cancellation or refund requests, contact us at
              <b> sticktoon.xyz@gmail.com</b> within 48 hours of delivery.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default RefundCancellation;
