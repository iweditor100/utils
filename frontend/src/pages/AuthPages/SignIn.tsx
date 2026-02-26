import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../../features/auth/useAuth";
import SignInForm from "../../components/auth/SignInForm";
import AuthLayout from "./AuthPageLayout";

export default function SignIn() {
  const { loginWithGoogle, isLoginLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      if (!credentialResponse.credential) {
        throw new Error("Missing Google credential");
      }

      await loginWithGoogle({ idToken: credentialResponse.credential }).unwrap();
      // ❗ No redirect here — AuthLayout handles it
    } catch (err) {
      console.error("Google login failed", err);
      setError("Google sign-in failed. Please try again.");
    }
  };

  const handleGoogleError = () => {
    setError("Google sign-in was unsuccessful. Please try again.");
  };

  return (
    <AuthLayout>
      <SignInForm
        error={error}
        googleLoginButton={
          <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
          theme="outline"
          shape="pill"
            width="320"
            />
          }
        />
    </AuthLayout>
  );
}
