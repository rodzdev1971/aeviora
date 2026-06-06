import {useState} from 'react';

import { Link, useNavigate } from "react-router-dom";

export default function Login() {
const [error, setError] = useState(false)
  const navigate = useNavigate();

  function handleLogin(e) {
    e.preventDefault();

    /*
      Demo only.
      Production should validate credentials on a HIPAA-compliant backend.
    */
    console.log(e.target.email.value)
    const username = e.target.email.value;
    const pwd = e.target.password.value;

    if(username == 'demo@demo.com' && pwd == 'demo'){
        sessionStorage.setItem("aeviora_session", "active");
        navigate("/dashboard");
    }else{
        setError(prevError => true)
    }
    
  }
  function resetError(e){
    e.target.value = ''
    setError(prevError => false)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-aeviora-black px-6 py-10">
      <div className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-2xl">
        <Link to="/" className="mx-auto mb-8 flex w-fit flex-col items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-aeviora-gold text-2xl font-bold text-aeviora-gold">
            A
          </div>
          <p className="mt-3 font-display text-2xl">Aeviora Wellness</p>
          <p className="text-xs uppercase tracking-[0.25em] text-aeviora-gold">
            Secure Portal
          </p>
        </Link>

        <h1 className="font-display text-3xl">Patient Login</h1>
        <p className="mt-2 text-sm text-gray-600">
          Access your wellness records and patient information.
        </p>
        {error ? <p className='text-red-400 font-semibold'>Username and password does not match</p> : ''}
        <form onSubmit={handleLogin} className="mt-8 grid gap-5">
          <div>
            <label className="label">Email Address</label>
            <input className="input" type="email" name='email' onFocus={resetError} required />
          </div>

          <div>
            <label className="label">Password</label>
            <input className="input" name="password" onFocus={resetError} type="password" required />
          </div>

          <button type="submit" className="btn-primary w-full">
            Login Securely
          </button>
        </form>

        <div className="mt-6 flex justify-between text-sm">
          <Link to="/register" className="text-aeviora-gold">
            Create account
          </Link>
          <button className="text-gray-500">
            Forgot password?
          </button>
        </div>
      </div>
    </main>
  );
}