import { useState } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import { useModal } from "../hooks/useModal";
import { Modal } from "../components/ui/modal";
import Button from "../components/ui/button/Button";
import Input from "../components/form/input/InputField";
import Label from "../components/form/Label";
import { useGetSettingsQuery, useUpdateSettingsMutation } from "../features/users/userSettingsApi";

// ─── Personal Info Card ────────────────────────────────────────────────────────
function PersonalInfoCard() {
  const { isOpen, openModal, closeModal } = useModal();
  const { data: settingsData } = useGetSettingsQuery();
  const [updateSettings, { isLoading }] = useUpdateSettingsMutation();

  const settings = settingsData?.data?.settings ?? {};

  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");

  const handleOpen = () => {
    setPhone(settings.phone ?? "");
    setBio(settings.bio ?? "");
    openModal();
  };

  const handleSave = async () => {
    try {
      await updateSettings({ phone, bio }).unwrap();
      closeModal();
    } catch (err) {
      console.error("Failed to update personal info", err);
    }
  };

  return (
    <>
      <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">
              Extended Info
            </h4>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
              <div>
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Phone</p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {settings.phone || "—"}
                </p>
              </div>
              <div className="lg:col-span-2">
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Bio</p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90 whitespace-pre-wrap">
                  {settings.bio || "—"}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleOpen}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto"
          >
            <EditIcon />
            Edit
          </button>
        </div>
      </div>

      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
        <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">Extended Info</h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Add a phone number and short bio to your profile.
            </p>
          </div>
          <form className="flex flex-col" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            <div className="custom-scrollbar h-[400px] overflow-y-auto px-2 pb-3">
              <div className="grid grid-cols-1 gap-x-6 gap-y-5">
                <div>
                  <Label>Phone Number</Label>
                  <Input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 000 0000" />
                </div>
                <div>
                  <Label>Bio</Label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                    placeholder="Tell us a little about yourself..."
                    className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
                  />
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

// ─── Address Card ──────────────────────────────────────────────────────────────
function AddressCard() {
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
      await updateSettings({ address: { street, city, state, zip, country } }).unwrap();
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
            <EditIcon />
            Edit
          </button>
        </div>
      </div>

      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
        <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">Edit Address</h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">Update your address details.</p>
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

// ─── Social Links Card ─────────────────────────────────────────────────────────
function SocialLinksCard() {
  const { isOpen, openModal, closeModal } = useModal();
  const { data: settingsData } = useGetSettingsQuery();
  const [updateSettings, { isLoading }] = useUpdateSettingsMutation();

  const social = settingsData?.data?.settings?.social ?? {};

  const [twitter, setTwitter] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [github, setGithub] = useState("");
  const [website, setWebsite] = useState("");

  const handleOpen = () => {
    setTwitter(social.twitter ?? "");
    setLinkedin(social.linkedin ?? "");
    setGithub(social.github ?? "");
    setWebsite(social.website ?? "");
    openModal();
  };

  const handleSave = async () => {
    try {
      await updateSettings({ social: { twitter, linkedin, github, website } }).unwrap();
      closeModal();
    } catch (err) {
      console.error("Failed to update social links", err);
    }
  };

  const linkRow = (label: string, value?: string) => (
    <div>
      <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">{label}</p>
      {value ? (
        <a href={value} target="_blank" rel="noreferrer" className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400 truncate block max-w-xs">
          {value}
        </a>
      ) : (
        <p className="text-sm font-medium text-gray-800 dark:text-white/90">—</p>
      )}
    </div>
  );

  return (
    <>
      <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">Social Links</h4>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
              {linkRow("Twitter / X", social.twitter)}
              {linkRow("LinkedIn", social.linkedin)}
              {linkRow("GitHub", social.github)}
              {linkRow("Website", social.website)}
            </div>
          </div>

          <button
            onClick={handleOpen}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto"
          >
            <EditIcon />
            Edit
          </button>
        </div>
      </div>

      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
        <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">Edit Social Links</h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">Add your social profiles and website.</p>
          </div>
          <form className="flex flex-col" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            <div className="custom-scrollbar h-[450px] overflow-y-auto px-2 pb-3">
              <div className="grid grid-cols-1 gap-x-6 gap-y-5">
                <div>
                  <Label>Twitter / X</Label>
                  <Input type="url" value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="https://twitter.com/yourhandle" />
                </div>
                <div>
                  <Label>LinkedIn</Label>
                  <Input type="url" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/yourprofile" />
                </div>
                <div>
                  <Label>GitHub</Label>
                  <Input type="url" value={github} onChange={(e) => setGithub(e.target.value)} placeholder="https://github.com/yourusername" />
                </div>
                <div>
                  <Label>Website</Label>
                  <Input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://yoursite.com" />
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

// ─── Shared icon ──────────────────────────────────────────────────────────────
function EditIcon() {
  return (
    <svg className="fill-current" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206ZM12.9698 3.84272C13.2627 3.54982 13.7376 3.54982 14.0305 3.84272L14.6934 4.50563C14.9863 4.79852 14.9863 5.2734 14.6934 5.56629L14.044 6.21573L12.3204 4.49215L12.9698 3.84272ZM11.2597 5.55281L5.6359 11.1766C5.53309 11.2794 5.46238 11.4099 5.43238 11.5522L5.01758 13.5185L6.98394 13.1037C7.1262 13.0737 7.25666 13.003 7.35947 12.9002L12.9833 7.27639L11.2597 5.55281Z" fill="" />
    </svg>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Settings() {
  return (
    <>
      <PageMeta title="Settings" description="Manage your account settings." />
      <PageBreadcrumb pageTitle="Settings" />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-7">Settings</h3>
        <div className="space-y-6">
          <PersonalInfoCard />
          <AddressCard />
          <SocialLinksCard />
        </div>
      </div>
    </>
  );
}
