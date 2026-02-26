import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeftIcon } from "../../../icons";
import Button from "../../../components/ui/button/Button";
import { useAuth } from "../useAuth";

export const VerifyEmailPage = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const navigate = useNavigate();
    const { verifyEmail, isVerifyEmailLoading } = useAuth();
    const [status, setStatus] = useState<"idle" | "verifying" | "success" | "error">("idle");
    const [error, setError] = useState<string | null>(null);
    const hasVerifiedRef = useRef(false);

    useEffect(() => {
        if (!token) return;
        if (hasVerifiedRef.current) return;

        hasVerifiedRef.current = true;
        handleVerify();
    }, [token]);


    const handleVerify = async () => {
        if (!token) {
            setStatus("error");
            setError("Missing verification token");
            return;
        }

        setStatus("verifying");
        setError(null);

        try {
            await verifyEmail({ token }).unwrap();
            setStatus("success");
        } catch (err: any) {
            setStatus("error");
            const errorMessage = err?.data?.message || err?.message || "Verification failed. The token may be invalid or expired.";
            setError(errorMessage);
        }
    };

    if (!token && status === "idle") {
        return (
            <div className="flex flex-col flex-1">
                
                <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
                    <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-900/20 dark:border-yellow-800">
                        <h2 className="mb-2 text-lg font-semibold text-yellow-800 dark:text-yellow-400">
                            Verification Token Required
                        </h2>
                        <p className="mb-4 text-sm text-yellow-700 dark:text-yellow-300">
                            Please check your email for the verification link.
                        </p>
                        <Link to="/signin">
                            <Button size="sm">Go to Sign In</Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (status === "verifying" || isVerifyEmailLoading) {
        return (
            <div className="flex flex-col flex-1">
                <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
                    <div className="p-6 text-center">
                        <div className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
                            Verifying your email...
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            Please wait while we verify your email address.
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (status === "success") {
        return (
            <div className="flex flex-col flex-1">
                <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
                    <div className="p-6 bg-green-50 border border-green-200 rounded-lg dark:bg-green-900/20 dark:border-green-800">
                        <h2 className="mb-2 text-lg font-semibold text-green-800 dark:text-green-400">
                            Email Verified Successfully!
                        </h2>
                        <p className="mb-4 text-sm text-green-700 dark:text-green-300">
                            Your email has been verified. You can now sign in to your account.
                        </p>
                        <Link to="/signin">
                            <Button size="sm" className="w-full">
                                Go to Sign In
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    return (
        <div className="flex flex-col flex-1">
            <div className="w-full max-w-md pt-10 mx-auto">
                <Link
                    to="/"
                    className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                    <ChevronLeftIcon className="size-5" />
                    Back to dashboard
                </Link>
            </div>

            <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
                <div className="p-6 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800">
                    <h2 className="mb-2 text-lg font-semibold text-red-800 dark:text-red-400">
                        Verification Failed
                    </h2>
                    <p className="mb-4 text-sm text-red-700 dark:text-red-300">
                        {error || "The verification token is invalid or has expired."}
                    </p>
                    <div className="flex gap-3">
                        <Link to="/signin" className="flex-1">
                            <Button size="sm" className="w-full" variant="outline">
                                Go to Sign In
                            </Button>
                        </Link>
                        <Link to="/signup" className="flex-1">
                            <Button size="sm" className="w-full">
                                Sign Up Again
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};
