import {useState} from 'react';
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import PasswordInput from '../components/passwordInput';
// import { Ps } from 'zod/v4/locales';


export default function Register() {
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault();

    /*
      Production HIPAA-oriented workflow:
      - Send data only over HTTPS.
      - Do not store PHI in localStorage.
      - Validate on backend.
      - Encrypt sensitive data at rest.
      - Use audit logs.
      - Use MFA for patient access.
      - Use Business Associate Agreements with vendors.
    */

    // sessionStorage.setItem("aeviora_session", "active");
    // navigate("/dashboard");
    const formData = new FormData(e.currentTarget);

    const payload = {
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      dateOfBirth: formData.get("dateOfBirth"),
      password: formData.get("password"),
      selectedProtocol: formData.get("selectedProtocol"),
      hipaaAcknowledged: formData.get("hipaaAcknowledged") === "on",
    };
  
    try {
      const response = await fetch("http://localhost:5000/api/patients/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        alert(data.message || "Registration failed.");
        return;
      }
  
      alert("Registration successful.");
      navigate("/login");
    } catch (error) {
      console.error(error);
      alert("Unable to connect to server.");
    }

  }

  const comparePWDHandler = (e) => {
    e.preventDefault()
    const {name, value} = e.target;
    setPWDData(prev=>({...prev, [name] :value }))
     // Real-time comparison check
     if (name === 'confirmPassword') {
      if (pwdData.password !== value) {
        setError('Passwords do not match');
        console.log('error')
      } else {
        setError('');
      }
    } else if (name === 'password') {
      if (pwdData.confirmPassword && value !== pwdData.confirmPassword) {
        setError('Passwords do not match');
      } else {
        setError('');
      }
    }
  };

  const togglePasswordVisibilityHandler = ()=>{
    setShowPassword(prev=>!prev)
  }
  

  return (
    <main className="min-h-screen  bg-aeviora-primaryDark px-6 py-10">
      <div className="mx-auto grid max-w-6xl overflow-hidden rounded-[2rem] bg-white shadow-2xl md:grid-cols-2">
        <section className="p-10 bg-aeviora-primary text-white">
          {/* <div className="absolute inset-0">
            <div className="absolute left-[-10%] top-[-10%] h-96 w-96 rounded-full bg-aeviora-gold/20 blur-3xl" />
            <div className="absolute bottom-[-15%] right-[-10%] h-[30rem] w-[30rem] rounded-full bg-aeviora-sage/20 blur-3xl" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(201,162,77,0.16),transparent_35%)]" />
          </div> */}
          <Link to="/" className="inline-flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-aeviora-gold text-xl font-bold text-aeviora-gold">
              A
            </div>
            <div>
              <p className="font-display text-2xl">Aeviora Wellness</p>
              <p className="text-xs uppercase tracking-[0.25em] text-aeviora-lightGold">
                Patient Portal
              </p>
            </div>
          </Link>

          <div className="mt-16">
            <ShieldCheck className="mb-6 h-12 w-12 text-aeviora-gold" />
            <h1 className="font-display text-5xl">Create your secure account</h1>
            <p className="mt-6 text-gray-300">
              Register to complete intake forms, manage your wellness records,
              and access your care information.
            </p>
          </div>  
        </section>

        <section className="p-8 md:p-10">
          <h2 className="font-display text-3xl">Patient Registration</h2>
          <p className="mt-2 text-sm text-gray-600">
            Please enter your information exactly as it appears on your ID.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 grid gap-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                  <label className="label">First Name</label>
                  <input name='firstName' className="input" type="text" required />
              </div>

              <div>
                <label className="label">Last Name</label>
                <input name="lastName" className="input" type="text" required />
              </div>
            </div>

            <div>
              <label className="label">Email Address</label>
              <input name="email" className="input" type="email" required />
            </div>

            <div>
              <label className="label">Phone Number</label>
              <input name="phone" className="input" type="tel" required />
            </div>

            <div>
              <label className="label">Date of Birth</label>
              <input name="dateOfBirth" className="input" type="date" required />
            </div>

            <div>
              <PasswordInput />
            </div>

            <div>
             <PasswordInput />
            </div>
            {/* <div>
              <label className="label">Select Wellness</label>
              <select name="selectedProtocol" className="input">
                <option>General Wellness Consultation</option>
                <option>Hormone Optimization</option>
                <option>Peptide Therapy</option>
                <option>GLP-1 Weight Loss Program</option>
                <option>Functional Medicine</option>
                <option>NAD+ and IV Therapy</option>
                <option>Longevity Assessment</option>
              </select>
            </div> */}

            <label className="flex gap-3 text-sm text-gray-600">
              <input type="checkbox" required className="mt-1" />
              <span>
                I acknowledge that Aeviora Wellness will use secure systems to
                manage my patient information and that I will not share my portal
                credentials.
              </span>
            </label>

            <button className="btn-primary w-full" type="submit">
              Create Secure Account
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Already registered?{" "}
            <Link to="/login" className="font-semibold text-aeviora-gold">
              Login here
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}