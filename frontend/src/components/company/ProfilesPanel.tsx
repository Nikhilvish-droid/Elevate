"use client";

import { useEffect, useState } from "react";
import { PhotoUpload } from "@/components/Auth";
import {
  getCompanyWorkspace,
  updateCompanyMemberProfile,
  updateCompanyProfile,
  type CompanyWorkspace,
} from "@/lib/company";
import { setProfileCache, type Profile } from "@/lib/profile";
import { uploadAvatar } from "@/lib/storage";

type Props = {
  onProfileUpdated?: (profile: Profile) => void;
};

export function ProfilesPanel({ onProfileUpdated }: Props) {
  const [workspace, setWorkspace] = useState<CompanyWorkspace | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingMe, setSavingMe] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [existingPhoto, setExistingPhoto] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [size, setSize] = useState("");
  const [description, setDescription] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [twitter, setTwitter] = useState("");
  const [github, setGithub] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [existingLogo, setExistingLogo] = useState<string | null>(null);
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");
  const [address, setAddress] = useState("");
  const [postal, setPostal] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await getCompanyWorkspace();
        setWorkspace(data);
        setFullName(data.me.full_name || "");
        setPhone(data.me.phone || "");
        setExistingPhoto(data.me.profile_image_url || null);
        setName(data.company.name || "");
        setWebsite(data.company.website_url || "");
        setIndustry(data.company.industry || "");
        setSize(data.company.company_size || "");
        setDescription(data.company.description || "");
        setLinkedin(data.company.linkedin_url || "");
        setTwitter(data.company.twitter_url || "");
        setGithub(data.company.github_url || "");
        setExistingLogo(data.company.logo_url || null);
        const hq =
          data.locations.find((l) => l.is_headquarters) || data.locations[0];
        if (hq) {
          setCity(hq.city || "");
          setState(hq.state || "");
          setCountry(hq.country || "");
          setAddress(hq.address_line || "");
          setPostal(hq.postal_code || "");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load profiles.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function saveMe(e: React.FormEvent) {
    e.preventDefault();
    setSavingMe(true);
    setError("");
    setMessage("");
    try {
      let profile_image_url = existingPhoto;
      if (photoFile) {
        profile_image_url = await uploadAvatar(photoFile);
      }
      const profile = await updateCompanyMemberProfile({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        profile_image_url: profile_image_url || null,
      });
      setExistingPhoto(profile.profile_image_url || null);
      setPhotoFile(null);
      setProfileCache(profile);
      onProfileUpdated?.(profile);
      setMessage("Your profile was updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update profile.");
    } finally {
      setSavingMe(false);
    }
  }

  async function saveCompany(e: React.FormEvent) {
    e.preventDefault();
    if (!workspace?.can_edit_company) return;
    setSavingCompany(true);
    setError("");
    setMessage("");
    try {
      let logo_url = existingLogo;
      if (logoFile) {
        logo_url = await uploadAvatar(logoFile, { kind: "logo" });
      }
      const result = await updateCompanyProfile({
        name: name.trim(),
        website_url: website.trim() || null,
        industry: industry.trim() || null,
        company_size: size.trim() || null,
        description: description.trim() || null,
        linkedin_url: linkedin.trim() || null,
        twitter_url: twitter.trim() || null,
        github_url: github.trim() || null,
        logo_url: logo_url || null,
        location: {
          address_line: address.trim() || null,
          city: city.trim() || null,
          state: state.trim() || null,
          country: country.trim() || null,
          postal_code: postal.trim() || null,
        },
      });
      setExistingLogo(result.company.logo_url || null);
      setLogoFile(null);
      setWorkspace((prev) =>
        prev
          ? { ...prev, company: result.company, locations: result.locations }
          : prev,
      );
      setMessage("Company profile was updated.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update company profile.",
      );
    } finally {
      setSavingCompany(false);
    }
  }

  const field =
    "mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm";

  if (loading) {
    return (
      <p className="border border-line bg-elevated px-5 py-10 text-center text-sm text-muted">
        Loading profiles…
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-xl font-bold">Profiles</h2>
        <p className="mt-1 text-sm text-muted">
          Update your details
          {workspace?.can_edit_company
            ? " and company profile."
            : ". Company profile can only be edited by the founder."}
        </p>
      </div>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-brand">{message}</p> : null}

      <form onSubmit={saveMe} className="border border-line bg-elevated px-5 py-6">
        <h3 className="text-sm font-semibold">Your profile</h3>
        <div className="mt-4 space-y-4">
          <PhotoUpload
            label="Your photo"
            hint="JPG or PNG · up to 2 MB"
            file={photoFile}
            existingUrl={existingPhoto}
            onChange={setPhotoFile}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium sm:col-span-2">
              Full name
              <input
                className={field}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </label>
            <label className="block text-sm font-medium">
              Phone
              <input
                className={field}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>
            <label className="block text-sm font-medium">
              Email
              <input className={field} value={workspace?.me.email || ""} disabled />
            </label>
          </div>
        </div>
        <button
          type="submit"
          disabled={savingMe}
          className="mt-5 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
        >
          {savingMe ? "Saving…" : "Save profile"}
        </button>
      </form>

      <form
        onSubmit={saveCompany}
        className="border border-line bg-elevated px-5 py-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Company profile</h3>
          {!workspace?.can_edit_company ? (
            <span className="text-xs text-muted">View only · founder can edit</span>
          ) : null}
        </div>
        <fieldset
          disabled={!workspace?.can_edit_company}
          className="mt-4 space-y-4 disabled:opacity-80"
        >
          <PhotoUpload
            label="Company logo"
            hint="JPG or PNG · up to 2 MB"
            file={logoFile}
            existingUrl={existingLogo}
            onChange={setLogoFile}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium sm:col-span-2">
              Company name
              <input
                className={field}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
            <label className="block text-sm font-medium">
              Website
              <input
                className={field}
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </label>
            <label className="block text-sm font-medium">
              Industry
              <input
                className={field}
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              />
            </label>
            <label className="block text-sm font-medium">
              Company size
              <input
                className={field}
                value={size}
                onChange={(e) => setSize(e.target.value)}
              />
            </label>
            <label className="block text-sm font-medium sm:col-span-2">
              Description
              <textarea
                className={field}
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <label className="block text-sm font-medium">
              LinkedIn
              <input
                className={field}
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
              />
            </label>
            <label className="block text-sm font-medium">
              Twitter / X
              <input
                className={field}
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
              />
            </label>
            <label className="block text-sm font-medium">
              GitHub
              <input
                className={field}
                value={github}
                onChange={(e) => setGithub(e.target.value)}
              />
            </label>
            <label className="block text-sm font-medium">
              Address
              <input
                className={field}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </label>
            <label className="block text-sm font-medium">
              City
              <input
                className={field}
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </label>
            <label className="block text-sm font-medium">
              State
              <input
                className={field}
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
            </label>
            <label className="block text-sm font-medium">
              Country
              <input
                className={field}
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </label>
            <label className="block text-sm font-medium">
              Postal code
              <input
                className={field}
                value={postal}
                onChange={(e) => setPostal(e.target.value)}
              />
            </label>
          </div>
        </fieldset>
        {workspace?.can_edit_company ? (
          <button
            type="submit"
            disabled={savingCompany}
            className="mt-5 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
          >
            {savingCompany ? "Saving…" : "Save company"}
          </button>
        ) : null}
      </form>
    </div>
  );
}
