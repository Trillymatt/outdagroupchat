"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, FileText, FileImage, File as FileIcon, Loader2, Trash2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeList } from "@/lib/hooks/use-realtime-list";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDistanceToNow } from "date-fns";
import type { TripDocument } from "@/lib/types/trip";

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const BUCKET = "trip-documents";

function formatSize(bytes: number | null): string {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function iconFor(contentType: string | null) {
  if (contentType?.startsWith("image/")) return <FileImage className="h-5 w-5" />;
  if (contentType === "application/pdf" || contentType?.startsWith("text/")) return <FileText className="h-5 w-5" />;
  return <FileIcon className="h-5 w-5" />;
}

export function DocumentsClient({
  tripId,
  currentUserId,
  isOwner,
  initialDocuments,
  memberLookup,
}: {
  tripId: string;
  currentUserId: string;
  isOwner: boolean;
  initialDocuments: TripDocument[];
  memberLookup: Map<string, { name: string; color?: string }>;
}) {
  const [documents, setDocuments] = useRealtimeList<TripDocument>("trip_documents", tripId, initialDocuments);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function uploadFiles(files: FileList | File[]) {
    setError("");
    setUploading(true);
    const supabase = createClient();
    try {
      for (const file of Array.from(files)) {
        if (file.size > MAX_FILE_BYTES) {
          setError(`"${file.name}" is over 20 MB — upload a smaller file.`);
          continue;
        }
        const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
        const path = `${tripId}/${crypto.randomUUID()}${ext.toLowerCase()}`;

        const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
          contentType: file.type || "application/octet-stream",
        });
        if (uploadError) {
          setError(`Couldn't upload "${file.name}": ${uploadError.message}`);
          continue;
        }

        const { data, error: insertError } = await supabase
          .from("trip_documents")
          .insert({
            trip_id: tripId,
            name: file.name,
            file_path: path,
            content_type: file.type || null,
            size_bytes: file.size,
            uploaded_by: currentUserId,
          })
          .select()
          .single();

        if (insertError) {
          await supabase.storage.from(BUCKET).remove([path]);
          setError(`Couldn't save "${file.name}": ${insertError.message}`);
        } else if (data) {
          setDocuments((prev) => (prev.some((d) => d.id === data.id) ? prev : [data, ...prev]));
        }
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDownload(doc: TripDocument) {
    const supabase = createClient();
    const { data, error: signError } = await supabase.storage.from(BUCKET).createSignedUrl(doc.file_path, 300, {
      download: doc.name,
    });
    if (signError || !data?.signedUrl) {
      setError("Couldn't create a download link. Try again.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  }

  async function handleDelete(doc: TripDocument) {
    if (!confirm(`Delete "${doc.name}"?`)) return;
    const supabase = createClient();
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    await supabase.from("trip_documents").delete().eq("id", doc.id);
    await supabase.storage.from(BUCKET).remove([doc.file_path]);
  }

  return (
    <div className="space-y-6">
      <Card
        className={dragOver ? "ring-2 ring-green/40" : undefined}
        onDragOver={(e: React.DragEvent) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e: React.DragEvent) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length > 0) void uploadFiles(e.dataTransfer.files);
        }}
      >
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <Upload className="h-6 w-6 text-ink-soft/60" />
          <p className="text-sm text-ink-soft">Drag a confirmation here, or</p>
          <Button size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {uploading ? "Uploading…" : "Choose files"}
          </Button>
          <p className="text-xs text-ink-soft/60">PDFs, images, anything up to 20 MB</p>
          {error && <p className="text-xs font-medium text-danger">{error}</p>}
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && e.target.files.length > 0 && void uploadFiles(e.target.files)}
          />
        </div>
      </Card>

      {documents.length === 0 ? (
        <EmptyState
          title="No documents yet"
          description="Upload Airbnb confirmations, flight tickets, and rental car receipts so nobody digs through email on travel day."
        />
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {documents.map((doc) => {
              const uploader = memberLookup.get(doc.uploaded_by);
              const canDelete = doc.uploaded_by === currentUserId || isOwner;
              return (
                <motion.div
                  key={doc.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  className="group flex items-center gap-3 rounded-2xl border border-line bg-paper px-4 py-3"
                >
                  <span className="shrink-0 rounded-xl bg-green/10 p-2 text-green-dark">{iconFor(doc.content_type)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{doc.name}</p>
                    <p className="text-xs text-ink-soft">
                      {formatSize(doc.size_bytes)}
                      {doc.size_bytes != null && " · "}
                      {uploader?.name ?? "Someone"} · {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="ghost" size="sm" className="!px-2" onClick={() => handleDownload(doc)} aria-label="Download">
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="!px-2 text-danger hover:text-danger"
                        onClick={() => handleDelete(doc)}
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
