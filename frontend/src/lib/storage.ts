import { createClient } from "@/lib/supabase/client";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function extFromName(name: string, fallback: string) {
  const part = name.split(".").pop()?.toLowerCase();
  return part && part.length <= 5 ? part : fallback;
}

/** Profile / company logo → public URL for users.profile_image_url / companies.logo_url */
export async function uploadAvatar(file: File) {
  if (!IMAGE_TYPES.includes(file.type)) {
    throw new Error("Image must be JPG, PNG, WEBP, or GIF.");
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error("Image must be 2 MB or smaller.");
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const path = `${user.id}/avatar.${extFromName(file.name, "jpg")}`;
  const { error } = await supabase.storage.from("avatar").upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from("avatar").getPublicUrl(path);
  return data.publicUrl;
}

export type UploadedResume = {
  file_name: string;
  file_url: string;
  file_type: "pdf" | "docx";
  file_size_bytes: number;
};

/** Resume → Storage, then insert into public.resumes via onboarding */
export async function uploadResume(file: File): Promise<UploadedResume> {
  const isPdf = /\.pdf$/i.test(file.name) || file.type === "application/pdf";
  const isDocx =
    /\.docx$/i.test(file.name) ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  if (!isPdf && !isDocx) {
    throw new Error("Resume must be PDF or DOCX.");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Resume must be 10 MB or smaller.");
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const file_type: "pdf" | "docx" = isPdf ? "pdf" : "docx";
  const path = `${user.id}/${Date.now()}-resume.${file_type}`;

  const { error } = await supabase.storage.from("resumes").upload(path, file, {
    upsert: false,
    contentType: file.type || (isPdf ? "application/pdf" : undefined),
  });
  if (error) throw new Error(error.message);

  return {
    file_name: file.name,
    file_url: path,
    file_type,
    file_size_bytes: file.size,
  };
}
