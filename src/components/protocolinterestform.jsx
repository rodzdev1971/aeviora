export default function ProtocolInterestForm({ selectedProtocol, onClose }) {
    console.log(selectedProtocol)
    function handleSubmit(e) {
      e.preventDefault();
  
      const formData = new FormData(e.currentTarget);
  
      const data = {
        protocol: selectedProtocol,
        firstName: formData.get("firstName"),
        lastName: formData.get("lastName"),
        email: formData.get("email"),
        phone: formData.get("phone"),
        message: formData.get("message"),
      };
  
      console.log("Protocol interest submitted:", data);
  
      /*
        Production recommendation:
        Send this securely to your backend using HTTPS.
        Do not store PHI in localStorage.
      */
  
      onClose();
    }
  
    return (
      <form onSubmit={handleSubmit} className="grid gap-5">
        <div className="rounded-2xl border border-aeviora-gold/40 bg-aeviora-cream p-4">
          <p className="text-xs uppercase tracking-[0.25em] text-aeviora-gold">
            Selected Protocol
          </p>
          <p className="mt-1 font-display text-2xl text-aeviora-black">
            {selectedProtocol || "General Wellness Consultation"}
          </p>
        </div>
  
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="label">First Name</label>
            <input
              name="firstName"
              type="text"
              className="input"
              placeholder="First name"
              required
            />
          </div>
  
          <div>
            <label className="label">Last Name</label>
            <input
              name="lastName"
              type="text"
              className="input"
              placeholder="Last name"
              required
            />
          </div>
        </div>
  
        <div>
          <label className="label">Email Address</label>
          <input
            name="email"
            type="email"
            className="input"
            placeholder="patient@email.com"
            required
          />
        </div>
  
        <div>
          <label className="label">Phone Number</label>
          <input
            name="phone"
            type="tel"
            className="input"
            placeholder="305-000-0000"
            required
          />
        </div>
  
        <div>
          <label className="label">What are you interested in?</label>
          <textarea
            name="message"
            className="input min-h-32"
            placeholder="Tell us about your wellness goals, symptoms, or protocol interest..."
          />
        </div>
  
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <label className="flex gap-3 text-sm leading-6 text-gray-600">
            <input type="checkbox" required className="mt-1" />
            <span>
              I understand this form is not for emergencies and that sensitive
              medical information should only be submitted through secure,
              HIPAA-compliant systems.
            </span>
          </label>
        </div>
  
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
  
          <button type="submit" className="btn-primary">
            Submit Interest
          </button>
        </div>
      </form>
    );
  }