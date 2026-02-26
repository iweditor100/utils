import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useModal } from "../../hooks/useModal";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import { useChangePasswordMutation } from "../../features/auth/authApi";
import { useAppDispatch } from "../../app/hooks";
import { clearCredentials } from "../../features/auth/authSlice";

export default function ChangePasswordCard() {
  const { isOpen, openModal, closeModal } = useModal();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [changePassword, { isLoading }] = useChangePasswordMutation();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Clear sensitive state on unmount
  useEffect(() => {
    return () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setFieldErrors({});
      setGeneralError(null);
    };
  }, []);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!currentPassword.trim()) {
      errors.currentPassword = "Current password is required";
    }

    if (!newPassword.trim()) {
      errors.newPassword = "New password is required";
    } else if (newPassword.length < 8) {
      errors.newPassword = "New password must be at least 8 characters";
    } else if (newPassword === currentPassword) {
      errors.newPassword = "New password must be different from current password";
    }

    if (!confirmPassword.trim()) {
      errors.confirmPassword = "Please confirm your new password";
    } else if (confirmPassword !== newPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    setFieldErrors({});
    setGeneralError(null);

    if (!validateForm()) {
      return;
    }

    try {
      await changePassword({
        currentPassword,
        newPassword,
      }).unwrap();

      // Clear form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setFieldErrors({});
      setGeneralError(null);

      // Close modal
      closeModal();

      // Clear auth credentials (backend revokes all sessions)
      dispatch(clearCredentials());

      // Redirect to login
      navigate("/signin", { replace: true });
    } catch (error: any) {
      // Handle backend errors
      const errors = error?.data?.errors;
      if (Array.isArray(errors) && errors.length > 0) {
        const newFieldErrors: Record<string, string> = {};
        errors.forEach((err: Record<string, string>) => {
          Object.keys(err).forEach((field) => {
            newFieldErrors[field] = err[field];
          });
        });
        setFieldErrors(newFieldErrors);
      } else {
        // Generic error message
        setGeneralError(
          error?.data?.message || error?.message || "Failed to change password. Please try again."
        );
      }
    }
  };

  const handleOpen = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setFieldErrors({});
    setGeneralError(null);
    openModal();
  };

  return (
    <>
      <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">
              Change Password
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Update your password to keep your account secure.
            </p>
          </div>

          <button
            onClick={handleOpen}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto"
          >
            <svg
              className="fill-current"
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206ZM12.9698 3.84272C13.2627 3.54982 13.7376 3.54982 14.0305 3.84272L14.6934 4.50563C14.9863 4.79852 14.9863 5.2734 14.6934 5.56629L14.044 6.21573L12.3204 4.49215L12.9698 3.84272ZM11.2597 5.55281L5.6359 11.1766C5.53309 11.2794 5.46238 11.4099 5.43238 11.5522L5.01758 13.5185L6.98394 13.1037C7.1262 13.0737 7.25666 13.003 7.35947 12.9002L12.9833 7.27639L11.2597 5.55281Z"
                fill=""
              />
            </svg>
            Change Password
          </button>
        </div>
      </div>

      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
        <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Change Password
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Enter your current password and choose a new one.
            </p>
          </div>

          <form
            className="flex flex-col"
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
          >
            <div className="custom-scrollbar h-[450px] overflow-y-auto px-2 pb-3">
              <div>
                <h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90 lg:mb-6">
                  Password Information
                </h5>

                {generalError && (
                  <div className="mb-5 p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
                    {generalError}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                  <div className="col-span-2">
                    <Label>Current Password</Label>
                    <Input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      error={!!fieldErrors.currentPassword}
                      disabled={isLoading}
                    />
                    {fieldErrors.currentPassword && (
                      <p className="mt-1 text-sm text-red-500">
                        {fieldErrors.currentPassword}
                      </p>
                    )}
                  </div>

                  <div className="col-span-2">
                    <Label>New Password</Label>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      error={!!fieldErrors.newPassword}
                      disabled={isLoading}
                    />
                    {fieldErrors.newPassword && (
                      <p className="mt-1 text-sm text-red-500">
                        {fieldErrors.newPassword}
                      </p>
                    )}
                  </div>

                  <div className="col-span-2">
                    <Label>Confirm New Password</Label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      error={!!fieldErrors.confirmPassword}
                      disabled={isLoading}
                    />
                    {fieldErrors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-500">
                        {fieldErrors.confirmPassword}
                      </p>
                    )}
                  </div>
                  <p className="mb-6 text-xs text-gray-500 dark:text-gray-400 lg:mb-7">
                    Changing your password will log you out of all your sessions.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
              <Button size="sm" variant="outline" onClick={closeModal} disabled={isLoading}>
                Close
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isLoading} type="submit">
                {isLoading ? "Changing..." : "Change Password"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
