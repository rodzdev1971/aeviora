import GLP1ConsentForm from '../components/consents/glp1ConsentForm';

export default function ConsentForms(){
  const handleConsentSubmit = async (payload) => {
    // Send this to your HIPAA-secure backend API.
    await fetch("/api/consents/glp1", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(payload),
    });
  };

  return <GLP1ConsentForm onSubmit={handleConsentSubmit} />;
}