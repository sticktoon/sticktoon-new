import { useState } from "react";

const faqs = [
  {
    q: "How will I receive my order?",
    a: "Your order will be delivered to your registered address via our trusted delivery partners."
  },
  {
    q: "In how many days will I receive my order?",
    a: "Orders are usually delivered within 5–7 business days depending on your location."
  },
  {
    q: "Can I make any modifications to my order?",
    a: "Once the order is placed, modifications are not possible. Please contact support for urgent cases."
  },
  {
    q: "Are there any shipping charges?",
    a: "Shipping charges are shown at checkout. Free delivery may apply on selected offers."
  },
  {
    q: "I want to cancel my order",
    a: "Orders can be cancelled before they are shipped. Please reach out to our support team."
  },
  {
    q: "How secure is shopping on StickToon?",
    a: "Your data is fully protected using industry-standard security practices."
  },
  {
    q: "Do you have Cash on Delivery?",
    a: "Yes, Cash on Delivery (COD) is available on all eligible orders."
  },
  {
    q: "What if my payment fails?",
    a: "If your payment fails, the order will not be placed. You can retry using another method."
  },
  {
    q: "What if I am not at home when my order arrives?",
    a: "Our delivery partner will attempt re-delivery or contact you for further instructions."
  }
];

export default function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (

    <div className="min-h-screen relative overflow-hidden bg-white">







      {/* Premium background glow - Logo Theme */}
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

     <div className="relative max-w-4xl mx-auto px-6 pt-12 pb-20">

       <div className="text-center mb-8">
         <div className="inline-flex items-center gap-3 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 px-6 py-3 rounded-full mb-4 border-2 border-yellow-500/30">
           <span className="text-[11px] font-black text-yellow-700 uppercase tracking-widest">Help Center</span>
         </div>
         <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-slate-900 via-yellow-700 to-orange-700 bg-clip-text text-transparent mb-2">
           Frequently Asked Questions
         </h1>
         <p className="text-slate-600 text-sm md:text-base max-w-2xl mx-auto">
           Quick answers to common questions about orders, delivery, and payments.
         </p>
       </div>


        <div className="space-y-4">
          {faqs.map((item, index) => (
            <div
              key={index}
              className="bg-gradient-to-br from-white to-yellow-50/50 backdrop-blur border-2 border-yellow-500/20 rounded-2xl shadow-sm hover:shadow-2xl hover:shadow-yellow-500/20 hover:border-yellow-500/60 transition-all duration-300 group"
            >
              <button
                onClick={() =>
                  setOpenIndex(openIndex === index ? null : index)
                }
                className="w-full flex justify-between items-center px-6 py-5 font-semibold text-left text-slate-900"
              >
                <span className="text-base md:text-lg group-hover:text-yellow-700 transition-colors">{item.q}</span>
                <span className="text-2xl text-yellow-600 group-hover:text-orange-600 transition-colors">
                  {openIndex === index ? "−" : "+"}
                </span>
              </button>

              {openIndex === index && (
                <div className="px-6 pb-5 text-slate-700 text-sm md:text-base border-t border-yellow-500/20 pt-4">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
