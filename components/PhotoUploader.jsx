"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, CircleAlert, Loader2, Trash2, Upload } from "lucide-react";

import Avatar from "@/components/ui/Avatar";
import { updateViewer } from "@/lib/useViewer";
import { cn } from "@/lib/utils";

/**
 * The control a member uses to put a face on their profile.
 *
 * ── WHY IT RESIZES BEFORE UPLOADING ────────────────────────────────────────
 * A photograph straight off a modern phone is 4-8MB. Most of this movement is
 * organising over mobile data, and asking someone in a ward office to push 8MB
 * up a slow uplink — to have the server immediately throw away all but a 512px
 * square of it — is the difference between a control people use and one they
 * abandon halfway. Downscaling in the browser first turns that into ~150KB and
 * a couple of seconds.
 *
 * It is a convenience, not a check. The server re-decodes, re-crops and
 * re-encodes whatever arrives (lib/photos.js), because anything a browser
 * produced is still something a member could have replaced by hand.
 */

/* What the browser downscales to. Double the 512px the server keeps, so its
   crop still has real pixels to work with. */
const CLIENT_MAX_EDGE = 1024;
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp";

export default function PhotoUploader({ name, photoUrl }) {
  const router = useRouter();
  const inputRef = useRef(null);
  const previewRef = useRef(null);

  const [current, setCurrent] = useState(photoUrl ?? null);
  const [preview, setPreview] = useState(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(null); // "uploading" | "removing" | null
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [dragging, setDragging] = useState(false);

  /* An object URL is a live handle into browser memory; it is not collected
     until it is revoked. Uploading five photos in a row without this leaks
     five decoded bitmaps. */
  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    []
  );

  const setPreviewUrl = useCallback((url) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = url;
    setPreview(url);
  }, []);

  const upload = useCallback(
    async (file) => {
      setError("");
      setDone("");

      if (!file.type.startsWith("image/")) {
        setError("That is not an image. Use a JPEG, PNG or WebP.");
        return;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        setError("That image is larger than 8MB. Choose a smaller one.");
        return;
      }

      setBusy("uploading");
      setProgress(0);
      setPreviewUrl(URL.createObjectURL(file));

      try {
        const prepared = await downscale(file);

        const body = new FormData();
        body.append("photo", prepared, "photo.jpg");

        const result = await send(body, setProgress);

        setCurrent(result.photoUrl);
        setPreviewUrl(null);
        setDone("Your photograph has been updated.");

        /* Two things now hold a copy of this: the masthead's cached viewer,
           and every server component on the page. Update both, or the member
           watches their new photo appear here and stay stale up in the bar. */
        updateViewer({ photoUrl: result.photoUrl });
        router.refresh();
      } catch (failure) {
        setPreviewUrl(null);
        setError(failure.message);
      } finally {
        setBusy(null);
        setProgress(0);
        // Let the same file be chosen again after a failure.
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [router, setPreviewUrl]
  );

  const remove = useCallback(async () => {
    setError("");
    setDone("");
    setBusy("removing");
    try {
      const response = await fetch("/api/member/photo", { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "That did not work. Please try again.");

      setCurrent(null);
      setDone("Your photograph has been removed.");
      updateViewer({ photoUrl: null });
      router.refresh();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(null);
    }
  }, [router]);

  const shown = preview ?? current;

  return (
    /* The whole block is the drop target, but it does not look like one until
       something is actually being dragged over it. A permanent dashed box is a
       large piece of furniture standing in for a control most members use once,
       and its hover state was the biggest interactive surface on the page for
       the least important thing on it. */
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(event) => {
        // Leaving for a child element is not leaving.
        if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        const file = event.dataTransfer.files?.[0];
        if (file && !busy) upload(file);
      }}
      className={cn(
        "relative flex flex-col gap-6 sm:flex-row sm:items-center",
        busy && "opacity-70"
      )}
    >
      {/* The photograph itself, at the size it will actually be seen. */}
      <div className="relative shrink-0 self-start">
        <Avatar name={name} src={shown} size="xl" />
        {busy === "uploading" && (
          <span className="absolute inset-0 grid place-items-center bg-ink-950/70">
            <Loader2 size={26} className="animate-spin text-white" aria-hidden="true" />
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* A label, not a button proxying for one: a click opens the picker
              and the keyboard reaches the file input inside it directly. */}
          <label
            className={cn(
              "inline-flex cursor-pointer items-center gap-2 border-2 border-ink-950 px-4 py-2.5 text-[0.6875rem] font-bold tracking-[0.08em] uppercase transition-colors",
              busy
                ? "pointer-events-none border-ink-300 text-ink-400"
                : "bg-ink-950 text-white hover:border-ember-600 hover:bg-ember-600"
            )}
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              /* `capture` is deliberately absent: it forces the camera and takes
                 away the photo the member already has on their phone. */
              disabled={Boolean(busy)}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) upload(file);
              }}
              className="sr-only"
            />
            <Camera size={14} strokeWidth={2.5} aria-hidden="true" />
            {current ? "Change photograph" : "Add a photograph"}
          </label>

          {current && !busy && (
            <button
              type="button"
              onClick={remove}
              className="inline-flex items-center gap-2 border-2 border-ink-200 px-4 py-2.5 text-[0.6875rem] font-bold tracking-[0.08em] text-ink-500 uppercase transition-colors hover:border-red-600 hover:text-red-700"
            >
              <Trash2 size={13} strokeWidth={2.5} aria-hidden="true" />
              Remove
            </button>
          )}

          {busy === "removing" && (
            <span className="inline-flex items-center gap-2 text-[0.8125rem] text-content-muted">
              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
              Removing…
            </span>
          )}
        </div>

        {/* A real progress bar, not a spinner. On a ward office connection the
            difference between "working" and "stuck" is the only thing the
            member wants to know. */}
        {busy === "uploading" && (
          <div className="mt-4">
            <div className="h-1.5 w-full bg-ink-200">
              <div
                className="h-full bg-brand-600 transition-[width] duration-200"
                style={{ width: `${Math.max(progress, 4)}%` }}
              />
            </div>
            <p className="mt-2 flex items-center gap-2 text-[0.75rem] text-content-muted">
              <Upload size={12} aria-hidden="true" />
              {progress < 100 ? `Uploading — ${progress}%` : "Processing…"}
            </p>
          </div>
        )}

        {/* `role="status"` rather than an alert: this is confirmation, and a
            screen reader should hear it without being interrupted mid-word. */}
        {done && (
          <p role="status" className="mt-4 border-l-4 border-brand-600 bg-brand-50 px-4 py-3 text-[0.8125rem] text-brand-900">
            {done}
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="mt-4 flex items-start gap-2.5 border-l-4 border-red-600 bg-red-50 px-4 py-3 text-[0.8125rem] leading-relaxed text-red-900"
          >
            <CircleAlert size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}

        <p className="mt-4 text-[0.75rem] leading-relaxed text-content-subtle">
          JPEG, PNG or WebP, up to 8MB — or drag one onto this card. It is
          cropped to a square around you and stripped of its location data
          before it is stored, and it is visible only to you and to the officers
          of your own territory.
        </p>
      </div>

      {/* Only while a file is actually over the card. Nothing here reserves
          space, so it cannot change the height of the page and set the sticky
          masthead oscillating. */}
      {dragging && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-3 grid place-items-center border-2 border-dashed border-brand-600 bg-brand-50/90"
        >
          <span className="font-display text-[0.875rem] font-bold tracking-tight text-brand-800">
            Drop your photograph
          </span>
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ helpers */

/**
 * POST the file with a real progress event.
 *
 * XMLHttpRequest, not fetch: fetch still cannot report *upload* progress in
 * any shipping browser, and the progress bar is most of the point on a slow
 * connection.
 */
function send(body, onProgress) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", "/api/member/photo");
    request.responseType = "json";

    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });

    request.addEventListener("load", () => {
      const data = request.response ?? {};
      if (request.status >= 200 && request.status < 300 && data.photoUrl) {
        resolve(data);
      } else {
        reject(new Error(data.error ?? "Your photograph could not be saved. Please try again."));
      }
    });
    request.addEventListener("error", () =>
      reject(new Error("Could not reach the server. Check your connection and try again."))
    );
    request.addEventListener("abort", () => reject(new Error("The upload was cancelled.")));

    request.send(body);
  });
}

/**
 * Downscale in a canvas. Returns the original file untouched if anything at
 * all goes wrong — a failed optimisation must never become a failed upload.
 */
async function downscale(file) {
  try {
    /* `from-image` matters more than it looks. Drawing to a canvas discards
       EXIF, so the server's own auto-orient has nothing left to read — without
       this, every photo taken on a phone held sideways arrives permanently
       rotated and there is no way back. */
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, CLIENT_MAX_EDGE / Math.max(bitmap.width, bitmap.height));

    // Already small enough. Re-encoding it would only lose quality.
    if (scale === 1 && file.size < 1_000_000) {
      bitmap.close?.();
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const context = canvas.getContext("2d");
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9)
    );
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}
