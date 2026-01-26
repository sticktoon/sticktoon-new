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

    <div className="min-h-screen relative overflow-hidden bg-[#f8fafc]">


{/* Top soft glow */}
{/* <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-indigo-400/20 rounded-full blur-[180px]" /> */}

{/* Secondary subtle glow */}
{/* <div className="absolute top-[200px] right-[-200px] w-[600px] h-[600px] bg-sky-300/20 rounded-full blur-[160px]" /> */}





     <div className="max-w-4xl mx-auto px-6 pt-12 pb-20">

       <h1 className="text-4xl font-extrabold tracking-tight mb-3">
  Frequently Asked Questions
</h1>
{/* <p className="text-slate-600 text-lg max-w-xl">
  Quick answers to common questions about orders, delivery, and payments.
</p> */}


        <div className="space-y-4">
          {faqs.map((item, index) => (
            <div
              key={index}
              className="bg-white border rounded-xl shadow-sm"
            >
              <button
                onClick={() =>
                  setOpenIndex(openIndex === index ? null : index)
                }
                className="w-full flex justify-between items-center px-6 py-4 font-semibold text-left"
              >
                <span>{item.q}</span>
                <span className="text-xl">
                  {openIndex === index ? "−" : "+"}
                </span>
              </button>

              {openIndex === index && (
                <div className="px-6 pb-4 text-slate-600">
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
