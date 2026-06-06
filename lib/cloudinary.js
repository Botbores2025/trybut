const CLOUD_NAME = "dqqtb4f5j";
const UPLOAD_PRESET = "trybut";

export async function uploadCloudinary(file) {
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", UPLOAD_PRESET);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: form }
  );
  if (!res.ok) throw new Error("falha no upload");
  const data = await res.json();
  return data.secure_url;
}
