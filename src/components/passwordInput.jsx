import {useState} from 'react';
import ButtonPassword from './buttonPassword';

export default function PasswordInput(){
    const [pwdData, setPWDData] = useState({password : '', confirmPassword : ''});
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

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
    
    return(
        <>
            <label className="label">Password</label>
            <div className="relative">
            {error && <p className='text-red-600'>{error}</p>}
            <input
                className="input"
                name="password"
                type={showPassword ? "text" : "password"}
                minLength={10}
                onChange={comparePWDHandler}
                required
                placeholder="Minimum 10 characters"
            />
            {/* Absolute Toggle Button Container */}
            <ButtonPassword showPassword={showPassword} error={error} showTogglePassword={togglePasswordVisibilityHandler} />
        </div>
        </>
    )
}