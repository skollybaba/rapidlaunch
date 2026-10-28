"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";

import { ThumbnailUpload } from "@/components/admin/thumbnail-upload";
import { useToast } from "@/components/ui/toast";
import { readApiError } from "@/lib/feedback";

interface ProfileImageControlProps {
  initialImageUrl: string;
  initialImageKey?: string;
}

export function ProfileImageControl({
  initialImageUrl,
  initialImageKey,
}: ProfileImageControlProps) {
  const router = useRouter();
  const toast = useToast();
  const [imageUrl, setImageUrl] = useState(initialImageUrl);
  const [imageKey, setImageKey] = useState(initialImageKey ?? "");
  const [pending, setPending] = useState(false);

  const dirty =
    imageUrl !== initialImageUrl || imageKey !== (initialImageKey ?? "");

  async function save() {
    setPending(true);
    try {
      const response = await fetch("/api/admin/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl,
          imageKey: imageUrl ? imageKey || undefined : undefined,
        }),
      });
      const body = (await response.json()) as {
        ok: boolean;
        data?: { imageUrl?: string; imageKey?: string };
        error?: { message?: string };
      };

      if (!response.ok || !body.ok) {
        toast.error({
          title: readApiError(body, "Could not save the profile photo."),
        });
        return;
      }

      setImageUrl(body.data?.imageUrl ?? "");
      setImageKey(body.data?.imageKey ?? "");
      toast.success({
        title: imageUrl
          ? "Profile photo updated"
          : "Profile photo removed",
        description: imageUrl
          ? "The About page now uses this photo."
          : "The About page will show the placeholder until a new photo is added.",
      });
      router.refresh();
    } catch {
      toast.error({ title: "Could not reach the server." });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <ThumbnailUpload
        id="profile-image"
        label="Profile photo"
        value={imageUrl}
        onChange={(url) => {
          setImageUrl(url);
          if (!url) setImageKey("");
        }}
        onUploaded={(asset) => {
          setImageUrl(asset.url);
          setImageKey(asset.key ?? "");
        }}
        aspect="portrait"
        expected="1200 × 1500 pixels (4:5 portrait)"
        help="Shown on the public About page. Upload a portrait photo; the site crops it to 4:5. Removing the photo restores the initials placeholder."
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={pending || !dirty}
          className="inline-flex items-center gap-2 rounded-pill bg-terracotta-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-[var(--duration-fast)] hover:bg-terracotta-500 disabled:pointer-events-none disabled:opacity-50"
        >
          {pending ? (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : (
            <Save aria-hidden="true" className="h-4 w-4" />
          )}
          {pending ? "Saving…" : "Save profile photo"}
        </button>
        {!dirty ? (
          <span className="text-xs text-neutral-500">
            Upload a new photo or paste a URL to enable saving.
          </span>
        ) : null}
      </div>
    </div>
  );
}
