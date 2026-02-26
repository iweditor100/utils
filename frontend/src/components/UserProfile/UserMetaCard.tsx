import { useState, useRef } from "react";
import { useModal } from "../../hooks/useModal";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import type { User } from "../../types/common";
import { useUpdateMyProfileMutation } from "../../features/users/usersApi";
import { useAvatarUpload } from "../../hooks/useAvatarUpload";

const ACCEPT_AVATAR = "image/jpeg,image/png,image/webp";

interface UserMetaCardProps {
  user: User;
}

export default function UserMetaCard({ user }: UserMetaCardProps) {
  const { isOpen, openModal, closeModal } = useModal();
  const [updateMyProfile, { isLoading }] = useUpdateMyProfileMutation();
  const { uploadAvatar } = useAvatarUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user.name || "");
  const [picture, setPicture] = useState(user.picture || "");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleSave = async () => {
    // Basic validation: at least one field must be provided
    if (!name.trim() && !picture.trim()) {
      console.error("At least one field must be provided");
      return;
    }

    try {
      const updateData: { name?: string; picture?: string } = {};
      if (name.trim() !== (user.name || "")) {
        updateData.name = name.trim() || undefined;
      }
      if (picture.trim() !== (user.picture || "")) {
        updateData.picture = picture.trim() || undefined;
      }

      // Only send if there are changes
      if (Object.keys(updateData).length > 0) {
        await updateMyProfile(updateData).unwrap();
        closeModal();
      } else {
        closeModal();
      }
    } catch (error) {
      console.error("Failed to update profile:", error);
    }
  };

  const handleOpen = () => {
    setName(user.name || "");
    setPicture(user.picture || "");
    openModal();
  };

  const triggerFileInput = () => {
    if (isUploading) return;
    setUploadError(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    try {
      await uploadAvatar(file);
      // Auth state updates via updateMyProfile onQueryStarted; avatar re-renders from user.picture
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed.";
      setUploadError(message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col items-center w-full gap-6 xl:flex-row">
            <div className="flex flex-col items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT_AVATAR}
                className="hidden"
                aria-hidden
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={triggerFileInput}
                disabled={isUploading}
                className="relative w-20 h-20 rounded-full border border-gray-200 dark:border-gray-800 overflow-hidden cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 group focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:ring-offset-2"
                aria-label="Edit or upload profile photo"
              >
                {user.picture ? (
                  <img src={user.picture} alt={user.name || user.email} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 text-2xl font-semibold">
                    {(user.name || user.email).charAt(0).toUpperCase()}
                  </div>
                )}
                {!isUploading && (
                  <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-medium text-center px-1">
                    Change photo
                  </span>
                )}
                {isUploading && (
                  <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                    <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden>
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </span>
                )}
              </button>
              {uploadError && (
                <p className="text-sm text-red-600 dark:text-red-400 text-center max-w-[200px]">{uploadError}</p>
              )}
            </div>
            <div className="order-3 xl:order-2">
              <h4 className="mb-2 text-lg font-semibold text-center text-gray-800 dark:text-white/90 xl:text-left">
                {user.name || "Not set"}
              </h4>
              <div className="flex flex-col items-center gap-1 text-center xl:flex-row xl:gap-3 xl:text-left">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {user.email}
                </p>
              </div>
            </div>
            <div className="flex items-center order-2 gap-2 grow xl:order-3 xl:justify-end">
              <button
                type="button"
                onClick={handleOpen}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline"
              >
                Edit details
              </button>
            </div>
          </div>
          <Button
            // type="Button"
            onClick={triggerFileInput}
            disabled={isUploading}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto disabled:opacity-60 disabled:cursor-not-allowed"
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
            Edit / Upload photo
          </Button>
        </div>
      </div>
      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
        <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Edit Personal Information
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Update your details to keep your profile up-to-date.
            </p>
          </div>
          <form className="flex flex-col">
            <div className="custom-scrollbar h-[450px] overflow-y-auto px-2 pb-3">
              <div>
                <h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90 lg:mb-6">
                  Personal Information
                </h5>

                <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                  <div className="col-span-2">
                    <Label>Name</Label>
                    <Input 
                      type="text" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div className="col-span-2">
                    <Label>Picture URL</Label>
                    <Input 
                      type="url" 
                      value={picture} 
                      onChange={(e) => setPicture(e.target.value)}
                      placeholder="https://example.com/picture.jpg"
                    />
                  </div>

                  <div className="col-span-2">
                    <Label>Email Address</Label>
                    <Input type="text" value={user.email} readOnly />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
              <Button size="sm" variant="outline" onClick={closeModal} disabled={isLoading}>
                Close
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
