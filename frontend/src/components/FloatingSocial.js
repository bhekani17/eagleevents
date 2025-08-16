import { MessageCircle, Phone, Mail } from 'lucide-react';

export default function FloatingSocial() {
  const whatsappNumber = '27839894082'; // +27 83 989 4082
  const whatsappText = encodeURIComponent(
    'Hello Eagles Events, I would like to inquire about your services.'
  );

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      {/* WhatsApp */}
      <a
        href={`https://wa.me/${whatsappNumber}?text=${whatsappText}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center w-12 h-12 rounded-full shadow-lg bg-green-600 hover:bg-green-700 text-white"
        aria-label="Chat on WhatsApp"
      >
        <MessageCircle className="w-6 h-6" />
      </a>

      {/* Call */}
      <a
        href="tel:+27839894082"
        className="inline-flex items-center justify-center w-12 h-12 rounded-full shadow-lg bg-white hover:bg-gray-50 text-gray-900 border"
        aria-label="Call Us"
      >
        <Phone className="w-6 h-6" />
      </a>

      {/* Email */}
      <a
        href="mailto:eaglesevents581@gmail.com?subject=Inquiry%20from%20Website"
        className="inline-flex items-center justify-center w-12 h-12 rounded-full shadow-lg bg-white hover:bg-gray-50 text-gray-900 border"
        aria-label="Email Us"
      >
        <Mail className="w-6 h-6" />
      </a>
    </div>
  );
}
