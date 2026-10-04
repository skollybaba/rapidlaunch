"use client";

import { useCallback, useEffect, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Download, Loader2, AlertCircle, FileText, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonStyles } from "@/components/ui/button";

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

interface PDFViewerClientProps {
  url: string;
  fileName?: string;
  fallbackUrl?: string;
}

export function PDFViewer({ url, fileName = "document.pdf", fallbackUrl }: PDFViewerClientProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [scale, setScale] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  // Fetch PDF with credentials and create blob URL for react-pdf
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    fetch(url, { credentials: "include", signal: controller.signal })
      .then(async (response) => {
        clearTimeout(timeoutId);
        if (cancelled) return;
        if (!response.ok) {
          const text = await response.text().catch(() => "");
          throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}${text ? ` - ${text.slice(0, 200)}` : ""}`);
        }
        const blob = await response.blob();
        if (cancelled) return;
        // Debug: log blob info
        console.log("[PDFViewer] Blob received:", { type: blob.type, size: blob.size });
        // Verify it's actually a PDF
        if (blob.type && !blob.type.includes("pdf") && !blob.type.includes("octet-stream")) {
          console.warn("[PDFViewer] Unexpected content type:", blob.type);
        }
        if (blob.size === 0) {
          throw new Error("Received empty PDF file (0 bytes)");
        }
        const objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        if (!cancelled) {
          if (err.name === "AbortError" || err.name === "TimeoutError") {
            setError(new Error("PDF load timed out. The file may be too large or the server is slow."));
          } else {
            setError(err);
          }
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [url, blobUrl]);

  const onLoadSuccess = useCallback((pdf: { numPages: number }) => {
    setNumPages(pdf.numPages);
    setScale(1);
    setIsLoading(false);
    setError(null);
  }, []);

  const onLoadError = useCallback((err: Error) => {
    console.error("[PDFViewer] PDF load error:", err);
    setError(err);
    setIsLoading(false);
  }, []);

  const handleDownload = useCallback(async () => {
    try {
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch PDF");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(fallbackUrl ?? url, "_blank", "noopener,noreferrer");
    }
  }, [url, fileName, fallbackUrl]);

  const handleRetry = useCallback(() => {
    setError(null);
    setIsLoading(true);
    setBlobUrl(null);
    setNumPages(null);
  }, []);

  const openInNewTab = useCallback(() => {
    window.open(fallbackUrl ?? url, "_blank", "noopener,noreferrer");
  }, [fallbackUrl, url]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
    if (!isFullscreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [isFullscreen]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (error) {
    return (
      <div className="rounded-[12px] border border-error-200 bg-error-50 p-6 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-error-500" />
        <p className="mt-3 text-sm font-medium text-error-700">Could not load PDF</p>
        <p className="mt-1 text-xs text-error-600">{error.message}</p>
        <div className="mt-4 flex gap-2 justify-center">
          <button
            type="button"
            onClick={handleRetry}
            className={buttonStyles({ variant: "primary" })}
          >
            <Loader2 className="h-4 w-4" />
            Retry
          </button>
          {fallbackUrl && (
            <button
              type="button"
              onClick={openInNewTab}
              className={buttonStyles({ variant: "secondary" })}
            >
              <FileText className="h-4 w-4" />
              Open in new tab
            </button>
          )}
        </div>
      </div>
    );
  }

  if (isLoading || !blobUrl || numPages === null) {
    return (
      <div className={cn("relative flex flex-col", isFullscreen && "fixed inset-0 z-50")}>
        <div className={cn("flex items-center gap-2 p-3 border-b border-neutral-200 shrink-0", isFullscreen && "bg-white")}>
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 shrink-0 text-neutral-500" />
            <span className="truncate text-sm font-medium text-neutral-950 max-w-[200px] sm:max-w-[300px]">
              {fileName}
            </span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleDownload}
              className={cn(
                buttonStyles({ variant: "ghost", size: "sm" }),
                "gap-1.5 shrink-0"
              )}
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Download</span>
            </button>
            {fallbackUrl && (
              <button
                type="button"
                onClick={openInNewTab}
                className={cn(
                  buttonStyles({ variant: "ghost", size: "sm" }),
                  "gap-1.5 shrink-0"
                )}
              >
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Open in new tab</span>
              </button>
            )}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1.5 rounded text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 shrink-0"
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className={cn("flex-1 overflow-auto min-h-0", isFullscreen && "flex-1")}>
          <div className="flex flex-col items-center justify-center h-[400px] gap-4 p-8">
            <Loader2 className="h-10 w-10 animate-spin text-terracotta-600" />
            <p className="text-sm text-neutral-600">Loading PDF document…</p>
            <p className="text-xs text-neutral-400">This may take a moment for large files</p>
            {fallbackUrl && (
              <button
                type="button"
                onClick={openInNewTab}
                className={buttonStyles({ variant: "secondary", className: "mt-2" })}
              >
                <FileText className="h-4 w-4" />
                Open in new tab instead
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative flex flex-col", isFullscreen && "fixed inset-0 z-50")}>
      <div className={cn("flex items-center gap-2 p-3 border-b border-neutral-200 shrink-0", isFullscreen && "bg-white")}>
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-4 w-4 shrink-0 text-neutral-500" />
          <span className="truncate text-sm font-medium text-neutral-950 max-w-[200px] sm:max-w-[300px]">
            {fileName}
          </span>
          {numPages && (
            <span className="text-xs text-neutral-500 px-2 py-0.5 rounded bg-neutral-100 shrink-0">
              {numPages} page{numPages !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
            disabled={scale <= 0.5}
            className="p-1.5 rounded text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
            aria-label="Zoom out"
          >
            <span className="text-lg font-bold">−</span>
          </button>
          <span className="w-14 text-center text-xs font-mono text-neutral-600 shrink-0">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(2, s + 0.25))}
            disabled={scale >= 2}
            className="p-1.5 rounded text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
            aria-label="Zoom in"
          >
            <span className="text-lg font-bold">+</span>
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className={cn(
              buttonStyles({ variant: "ghost", size: "sm" }),
              "gap-1.5 shrink-0"
            )}
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Download</span>
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 rounded text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 shrink-0"
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className={cn("flex-1 overflow-auto min-h-0", isFullscreen && "flex-1")}>
        <Document
          file={blobUrl}
          onLoadSuccess={onLoadSuccess}
          onLoadError={onLoadError}
        >
          <div className="flex flex-col items-center gap-4 p-4 w-full">
            {[...Array(numPages)].map((_, index) => (
              <div
                key={index + 1}
                className="w-full max-w-3xl shadow-sm"
                style={{ maxWidth: isFullscreen ? "900px" : "100%" }}
              >
                <div className="aspect-[0.71] bg-white shadow-inner rounded">
                  <Page
                    pageNumber={index + 1}
                    scale={scale}
                    renderTextLayer
                    renderAnnotationLayer
                    className="w-full h-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </Document>
      </div>
    </div>
  );
}