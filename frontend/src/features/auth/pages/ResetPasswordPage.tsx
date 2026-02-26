import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "../../../icons";
import Label from "../../../components/form/Label";
import Input from "../../../components/form/input/InputField";
import Button from "../../../components/ui/button/Button";
import { useAuth } from "../useAuth";
import { resetPasswordSchema, type ResetPasswordFormData } from "../schemas";

export const ResetPasswordPage = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const { resetPassword, isResetPasswordLoading } = useAuth();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ResetPasswordFormData>({
        resolver: zodResolver(resetPasswordSchema),
    });

    const onSubmit = async (data: ResetPasswordFormData) => {
        if (!token) {
            setError("Missing reset token. Please use the link from your email.");
            return;
        }

        setError(null);
        try {
            await resetPassword({ ...data, token }).unwrap();
            setSuccess(true);
            // Redirect to sign in after a short delay
            setTimeout(() => {
                navigate("/signin", { replace: true });
            }, 2000);
        } catch (err: any) {
            const errorMessage = err?.data?.message || err?.message || "Password reset failed. The token may be invalid or expired.";
            setError(errorMessage);
        }
    };

    if (!token) {
        return (
            <div className="flex flex-col flex-1">
                <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
                    <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-900/20 dark:border-yellow-800">
                        <h2 className="mb-2 text-lg font-semibold text-yellow-800 dark:text-yellow-400">
                            Reset Token Required
                        </h2>
                        <p className="mb-4 text-sm text-yellow-700 dark:text-yellow-300">
                            Please use the reset link from your email.
                        </p>
                        <Link to="/forgot-password">
                            <Button size="sm" className="w-full" variant="primary">
                                Request New Reset Link
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="flex flex-col flex-1">
                <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
                    <div className="p-6 bg-green-50 border border-green-200 rounded-lg dark:bg-green-900/20 dark:border-green-800">
                        <h2 className="mb-2 text-lg font-semibold text-green-800 dark:text-green-400">
                            Password Reset Successful!
                        </h2>
                        <p className="mb-4 text-sm text-green-700 dark:text-green-300">
                            Your password has been reset. Redirecting to sign in...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col flex-1">
            
            <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
                <div>
                    <div className="mb-5 sm:mb-8">
                        <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
                            Reset Password
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Enter your new password below.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)}>
                        <div className="space-y-6">
                            <div>
                                <Label>
                                    New Password <span className="text-error-500">*</span>
                                </Label>
                                <div className="relative">
                                    <Input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Enter your new password"
                                        {...register("newPassword")}
                                    />
                                    <span
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                                    >
                                        {showPassword ? (
                                            <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                                        ) : (
                                            <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                                        )}
                                    </span>
                                </div>
                                {errors.newPassword && (
                                    <p className="mt-1 text-sm text-red-500">
                                        {errors.newPassword.message}
                                    </p>
                                )}
                            </div>

                            <Button
                                type="submit"
                                className="w-full"
                                size="sm"
                                disabled={isResetPasswordLoading}
                            >
                                {isResetPasswordLoading ? "Resetting..." : "Reset Password"}
                            </Button>
                        </div>
                    </form>

                    {/* Error Message */}
                    {error && (
                        <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-md text-center border border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
                            {error}
                        </div>
                    )}

                    <div className="mt-5">
                        <p className="text-sm text-center text-gray-700 dark:text-gray-400">
                            Remember your password?{" "}
                            <Link
                                to="/signin"
                                className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
                            >
                                Sign In
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
