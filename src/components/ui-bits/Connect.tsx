import React, { useState } from "react";
import { Send, CheckCircle2 } from "lucide-react";

export default function Connect() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <section className="relative mx-auto w-full max-w-[1200px] px-4 py-12 sm:px-8">
      {/* Brutalist Journal Inquiry Container */}
      <div className="relative w-full rounded-2xl bg-card/80 border border-white/10 p-6 sm:p-10 md:p-12 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-fuchsia-500 opacity-60" />

        {/* Section Header with Typo Fix: PERSONAL MONOGRAPH INQUIRY SHEET */}
        <div className="flex flex-col mb-8 border-b border-white/10 pb-6">
          <span className="font-mono text-xs font-bold text-accent uppercase tracking-widest mb-1">
            DIRECT COMMUNICATION
          </span>
          <h2 className="text-2xl sm:text-4xl font-marker uppercase tracking-tight text-white">
            PERSONAL MONOGRAPH INQUIRY SHEET
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground/80 font-medium mt-2 max-w-xl leading-relaxed">
            Have a custom sticker order, collaboration idea, or wholesale request? Drop a message directly to our design lab.
          </p>
        </div>

        {submitted ? (
          <div className="py-12 flex flex-col items-center text-center">
            <CheckCircle2 className="h-12 w-12 text-primary mb-4 animate-bounce" />
            <h3 className="text-xl font-bold text-white uppercase tracking-tight">
              Inquiry Sheet Received
            </h3>
            <p className="text-xs text-muted-foreground mt-2 max-w-md">
              Thank you for reaching out. Our team will review your monograph inquiry and respond within 24 hours.
            </p>
            <button
              onClick={() => setSubmitted(false)}
              className="mt-6 text-xs font-bold text-primary hover:text-white uppercase tracking-widest transition-colors"
            >
              ← Send Another Inquiry
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Full Name Input */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-black uppercase tracking-wider text-foreground">
                  FULL NAME <span className="text-primary">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Alex Edmond"
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-blue-500/60 placeholder:font-sans placeholder:text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                />
              </div>

              {/* Email Address Input */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-black uppercase tracking-wider text-foreground">
                  EMAIL ADDRESS <span className="text-primary">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. alex@realzstickers.com"
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-blue-500/60 placeholder:font-sans placeholder:text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                />
              </div>
            </div>

            {/* Subject / Topic Input */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-black uppercase tracking-wider text-foreground">
                INQUIRY TOPIC <span className="text-primary">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="e.g. Custom Vinyl Drop / Wholesale Order"
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-blue-500/60 placeholder:font-sans placeholder:text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>

            {/* Message Area */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-black uppercase tracking-wider text-foreground">
                INQUIRY DETAILS <span className="text-primary">*</span>
              </label>
              <textarea
                rows={4}
                required
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Describe your project, custom sticker sizes, or volume inquiry..."
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-blue-500/60 placeholder:font-sans placeholder:text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors resize-none"
              />
            </div>

            {/* Submit Button with Hover Glow hover:bg-[#3D253B] */}
            <button
              type="submit"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-[#3D253B] hover:shadow-lg transition-all duration-300 cursor-pointer"
            >
              <span>SEND INQUIRY MESSAGE ↗</span>
              <Send className="h-4 w-4" />
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
