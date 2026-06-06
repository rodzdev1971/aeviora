export default function Intake() {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-aeviora-gold">
            Intake Forms
          </p>
          <h1 className="mt-2 font-display text-4xl">
            Wellness Intake Questionnaire
          </h1>
          <p className="mt-3 text-sm text-gray-600">
            This form is a frontend template. In production, all answers containing
            PHI should be transmitted securely to the backend and never saved in
            browser storage.
          </p>
        </div>
  
        <form className="grid gap-6">
          <section className="card">
            <h2 className="font-display text-2xl">Health Goals</h2>
  
            <div className="mt-6 grid gap-5">
              <div>
                <label className="label">Primary wellness goals</label>
                <textarea
                  className="input min-h-32"
                  placeholder="Example: weight optimization, energy, sleep, hormone balance..."
                />
              </div>
  
              <div>
                <label className="label">Current symptoms or concerns</label>
                <textarea className="input min-h-32" />
              </div>
            </div>
          </section>
  
          <section className="card">
            <h2 className="font-display text-2xl">Medical Background</h2>
  
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div>
                <label className="label">Current medications</label>
                <textarea className="input min-h-28" />
              </div>
  
              <div>
                <label className="label">Allergies</label>
                <textarea className="input min-h-28" />
              </div>
  
              <div>
                <label className="label">Past medical conditions</label>
                <textarea className="input min-h-28" />
              </div>
  
              <div>
                <label className="label">Family history</label>
                <textarea className="input min-h-28" />
              </div>
            </div>
          </section>
  
          <section className="card">
            <h2 className="font-display text-2xl">Lifestyle</h2>
  
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div>
                <label className="label">Sleep quality</label>
                <select className="input">
                  <option>Select one</option>
                  <option>Excellent</option>
                  <option>Good</option>
                  <option>Fair</option>
                  <option>Poor</option>
                </select>
              </div>
  
              <div>
                <label className="label">Exercise frequency</label>
                <select className="input">
                  <option>Select one</option>
                  <option>Daily</option>
                  <option>3-5 times per week</option>
                  <option>1-2 times per week</option>
                  <option>Rarely</option>
                </select>
              </div>
            </div>
          </section>
  
          <button type="submit" className="btn-primary">
            Submit Intake Securely
          </button>
        </form>
      </div>
    );
  }