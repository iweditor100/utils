import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeftIcon } from "../../../icons";
import Label from "../../../components/form/Label";
import Input from "../../../components/form/input/InputField";
import Button from "../../../components/ui/button/Button";
import { useAuth } from "../useAuth";
import { forgotPasswordSchema, type ForgotPasswordFormData } from "../schemas";

export const ForgotPasswordPage = () => {
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const { forgotPassword, isForgotPasswordLoading } = useAuth();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ForgotPasswordFormData>({
        resolver: zodResolver(forgotPasswordSchema),
    });

    const onSubmit = async (data: ForgotPasswordFormData) => {
        setError(null);
        setSuccess(false);
        try {
            await forgotPassword(data).unwrap();
            setSuccess(true);
        } catch (err: any) {
            const errorMessage = err?.data?.message || err?.message || "Failed to send reset email. Please try again.";
            setError(errorMessage);
        }
    };

    if (success) {
        return (
            <div className="flex flex-col flex-1">
                <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
                    <div className="p-6 bg-green-50 border border-green-200 rounded-lg dark:bg-green-900/20 dark:border-green-800">
                        <h2 className="mb-2 text-lg font-semibold text-green-800 dark:text-green-400">
                            Reset Email Sent!
                        </h2>
                        <p className="mb-4 text-sm text-green-700 dark:text-green-300">
                            If an account exists with that email, you will receive a password reset link shortly.
                        </p>
                        <Link to="/signin">
                            <Button size="sm" className="w-full">
                                Back to Sign In
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

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
                <div>
                    <div className="mb-5 sm:mb-8">
                        <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
                            Forgot Password
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Enter your email address and we&apos;ll send you a link to reset your password.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)}>
                        <div className="space-y-6">
                            <div>
                                <Label>
                                    Email <span className="text-error-500">*</span>
                                </Label>
                                <Input
                                    type="email"
                                    placeholder="Enter your email"
                                    {...register("email")}
                                />
                                {errors.email && (
                                    <p className="mt-1 text-sm text-red-500">
                                        {errors.email.message}
                                    </p>
                                )}
                            </div>

                            <Button
                                type="submit"
                                className="w-full"
                                size="sm"
                                disabled={isForgotPasswordLoading}
                            >
                                {isForgotPasswordLoading ? "Sending..." : "Send Reset Link"}
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
