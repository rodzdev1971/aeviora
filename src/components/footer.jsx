export default function Footer() {
    return (
      <footer className="bg-aeviora-black px-6 py-10 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <h3 className="font-display text-2xl text-aeviora-gold">
                Aeviora Wellness
              </h3>
              <p className="mt-3 text-sm text-gray-300">
                Personalized wellness, longevity care, and preventive health support.
              </p>
            </div>
  
            <div>
              <h4 className="font-semibold text-aeviora-lightGold">Contact</h4>
              <p className="mt-3 text-sm text-gray-300">
                Miami, Florida
                <br />
                info@aeviorawellness.com
                <br />
                305-000-0000
              </p>
            </div>
  
            <div>
              <h4 className="font-semibold text-aeviora-lightGold">Privacy Notice</h4>
              <p className="mt-3 text-sm text-gray-300">
                Patient information should only be transmitted through secure,
                encrypted, HIPAA-compliant systems.
              </p>
            </div>
          </div>
  
          <p className="mt-10 border-t border-white/10 pt-6 text-xs text-gray-400">
            © {new Date().getFullYear()} Aeviora Wellness. All rights reserved.
          </p>
        </div>
      </footer>
    );
  }