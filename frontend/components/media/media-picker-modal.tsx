"use client";

import { useEffect, useState } from "react";
import { Image as ImageIcon, Search, Check } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { getOrgMedia } from "@/lib/api";
import type { MediaFileItem } from "@/lib/types";

interface MediaPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string, item: MediaFileItem) => void;
  categoryFilter?: string;
}

export function MediaPickerModal({
  isOpen,
  onClose,
  onSelect,
  categoryFilter,
}: MediaPickerModalProps) {
  const [items, setItems] = useState<MediaFileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MediaFileItem | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    getOrgMedia({
      search: search || undefined,
      category: categoryFilter || undefined,
      limit: 30,
    })
      .then((res) => {
        setItems(res.items);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen, search, categoryFilter]);

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Select from Media Library"
      size="xl"
      flush
      // Opened from inside the page builder, which layers above the default z-50.
      containerClassName="z-[2000]!"
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!selectedUrl || !selectedItem}
            onClick={() => {
              if (selectedUrl && selectedItem) {
                onSelect(selectedUrl, selectedItem);
                onClose();
              }
            }}
          >
            Select Asset
          </button>
        </>
      }
    >
        {/* Search */}
        <div style={{ padding: "12px 24px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
          <div style={{ position: "relative" }}>
            <Search
              size={15}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#94a3b8",
              }}
            />
            <input
              type="text"
              placeholder="Search library assets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                paddingLeft: "34px",
                paddingRight: "12px",
                paddingTop: "8px",
                paddingBottom: "8px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                outline: "none",
                background: "#ffffff",
              }}
            />
          </div>
        </div>

        {/* Grid */}
        <div style={{ padding: "20px", overflowY: "auto", flex: 1, minHeight: "300px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
              Loading Media Library...
            </div>
          ) : items.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
              No media items found.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
                gap: "12px",
              }}
            >
              {items.map((item) => {
                const isSelected = selectedUrl === item.publicUrl;
                const isImg = item.category === "image" || item.mimeType.startsWith("image/");
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedUrl(item.publicUrl);
                      setSelectedItem(item);
                    }}
                    style={{
                      height: "110px",
                      borderRadius: "10px",
                      border: isSelected ? "2px solid #2563eb" : "1px solid #e2e8f0",
                      background: "#f8fafc",
                      overflow: "hidden",
                      cursor: "pointer",
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {isImg ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.publicUrl}
                        alt={item.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <ImageIcon size={28} style={{ color: "#94a3b8" }} />
                    )}

                    {isSelected && (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: "rgba(37, 99, 235, 0.4)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                        }}
                      >
                        <Check size={24} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

    </Modal>
  );
}
