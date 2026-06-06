export default function Profile() {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-aeviora-gold">
            Patient Profile
          </p>
          <h1 className="mt-2 font-display text-4xl">Manage Your Information</h1>
        </div>
  
        <form className="card grid gap-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="label">First Name</label>
              <input className="input" defaultValue="Patient" />
            </div>
  
            <div>
              <label className="label">Last Name</label>
              <input className="input" defaultValue="Name" />
            </div>
          </div>
  
          <div>
            <label className="label">Email Address</label>
            <input className="input" type="email" defaultValue="patient@example.com" />
          </div>
  
          <div>
            <label className="label">Phone Number</label>
            <input className="input" type="tel" defaultValue="305-000-0000" />
          </div>
  
          <div>
            <label className="label">Preferred Communication Method</label>
            <select className="input">
              <option>Secure Portal Message</option>
              <option>Phone Call</option>
              <option>Email - Non-sensitive only</option>
            </select>
          </div>
  
          <button type="submit" className="btn-primary">
            Save Profile
          </button>
        </form>
      </div>
    );
  }