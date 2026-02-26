import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "../../../icons";
import Label from "../../../components/form/Label";
import Input from "../../../components/form/input/InputField";
import Checkbox from "../../../components/form/input/Checkbox";
import Button from "../../../components/ui/button/Button";
import { useAuth } from "../useAuth";
import { registerSchema, type RegisterFormData } from "../schemas";

export const SignUpPage = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [isChecked, setIsChecked] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const { registerWithEmail, isRegisterLoading } = useAuth();
    const navigate = useNavigate();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
    });

    const onSubmit = async (data: RegisterFormData) => {
        setError(null);
        try {
            await registerWithEmail(data).unwrap();
            setSuccess(true);
            // Redirect to verify email page after a short delay
            setTimeout(() => {
                navigate("/verify-email", { 
                    state: { email: data.email },
                    replace: true 
                });
            }, 2000);
        } catch (err: any) {
            const errorMessage = err?.data?.message || err?.message || "Registration failed. Please try again.";
            setError(errorMessage);
        }
    };

    if (success) {
        return (
            <div className="flex flex-col flex-1">
                <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
                    <div className="p-6 bg-green-50 border border-green-200 rounded-lg dark:bg-green-900/20 dark:border-green-800">
                        <h2 className="mb-2 text-lg font-semibold text-green-800 dark:text-green-400">
                            Registration Successful!
                        </h2>
                        <p className="text-sm text-green-700 dark:text-green-300">
                            Please check your email to verify your account. You will be redirected shortly...
                        </p>
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
                            Sign Up
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Enter your information to create an account!
                        </p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)}>
                        <div className="space-y-5">
                            <div>
                                <Label>
                                    Name <span className="text-error-500">*</span>
                                </Label>
                                <Input
                                    type="text"
                                    placeholder="Enter your name"
                                    {...register("name")}
                                />
                                {errors.name && (
                                    <p className="mt-1 text-sm text-red-500">
                                        {errors.name.message}
                                    </p>
                                )}
                            </div>

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

                            <div>
                                <Label>
                                    Password <span className="text-error-500">*</span>
                                </Label>
                                <div className="relative">
                                    <Input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Enter your password"
                                        {...register("password")}
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
                                {errors.password && (
                                    <p className="mt-1 text-sm text-red-500">
                                        {errors.password.message}
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center gap-3">
                                <Checkbox
                                    checked={isChecked}
                                    onChange={setIsChecked}
                                />
                                <p className="inline-block text-sm font-normal text-gray-500 dark:text-gray-400">
                                    By creating an account, you agree to the{" "}
                                    <span className="text-gray-800 dark:text-white/90">
                                        Terms and Conditions
                                    </span>
                                    {" "}and our{" "}
                                    <span className="text-gray-800 dark:text-white">
                                        Privacy Policy
                                    </span>
                                </p>
                            </div>

                            <Button
                                type="submit"
                                className="w-full"
                                size="sm"
                                disabled={isRegisterLoading || !isChecked}
                            >
                                {isRegisterLoading ? "Signing up..." : "Sign Up"}
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
                            Already have an account?{" "}
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
