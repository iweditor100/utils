import { useState, useEffect } from "react";
import { useModal } from "../../hooks/useModal";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import { useGetSettingsQuery, useUpdateSettingsMutation } from "../../features/users/userSettingsApi";

export default function UserAddressCard() {
  const { isOpen, openModal, closeModal } = useModal();
  const { data: settingsData } = useGetSettingsQuery();
  const [updateSettings, { isLoading }] = useUpdateSettingsMutation();

  const address = settingsData?.data?.settings?.address ?? {};

  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("");

  const handleOpen = () => {
    setStreet(address.street ?? "");
    setCity(address.city ?? "");
    setState(address.state ?? "");
    setZip(address.zip ?? "");
    setCountry(address.country ?? "");
    openModal();
  };

  const handleSave = async () => {
    try {
      await updateSettings({
        address: { street, city, state, zip, country },
      }).unwrap();
      closeModal();
    } catch (err) {
      console.error("Failed to update address", err);
    }
  };

  return (
    <>
      <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">Address</h4>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
              <div>
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Street</p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">{address.street || "—"}</p>
              </div>
              <div>
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">City</p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">{address.city || "—"}</p>
              </div>
              <div>
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">State</p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">{address.state || "—"}</p>
              </div>
              <div>
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">ZIP / Postal Code</p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">{address.zip || "—"}</p>
              </div>
              <div>
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Country</p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">{address.country || "—"}</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleOpen}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto"
          >
            <svg className="fill-current" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206ZM12.9698 3.84272C13.2627 3.54982 13.7376 3.54982 14.0305 3.84272L14.6934 4.50563C14.9863 4.79852 14.9863 5.2734 14.6934 5.56629L14.044 6.21573L12.3204 4.49215L12.9698 3.84272ZM11.2597 5.55281L5.6359 11.1766C5.53309 11.2794 5.46238 11.4099 5.43238 11.5522L5.01758 13.5185L6.98394 13.1037C7.1262 13.0737 7.25666 13.003 7.35947 12.9002L12.9833 7.27639L11.2597 5.55281Z" fill="" />
            </svg>
            Edit
          </button>
        </div>
      </div>

      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
        <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">Edit Address</h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">Update your address information.</p>
          </div>
          <form className="flex flex-col" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            <div className="custom-scrollbar h-[450px] overflow-y-auto px-2 pb-3">
              <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                <div className="col-span-2">
                  <Label>Street Address</Label>
                  <Input type="text" value={street} onChange={(e) => setStreet(e.target.value)} placeholder="123 Main St" />
                </div>
                <div>
                  <Label>City</Label>
                  <Input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="New York" />
                </div>
                <div>
                  <Label>State / Province</Label>
                  <Input type="text" value={state} onChange={(e) => setState(e.target.value)} placeholder="NY" />
                </div>
                <div>
                  <Label>ZIP / Postal Code</Label>
                  <Input type="text" value={zip} onChange={(e) => setZip(e.target.value)} placeholder="10001" />
                </div>
                <div>
                  <Label>Country</Label>
                  <Input type="text" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="United States" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
              <Button size="sm" variant="outline" onClick={closeModal} disabled={isLoading}>Close</Button>
              <Button size="sm" type="submit" disabled={isLoading}>{isLoading ? "Saving..." : "Save Changes"}</Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
