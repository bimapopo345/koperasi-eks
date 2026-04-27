import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  archiveTos,
  createTos,
  deleteTos,
  getTosList,
  unarchiveTos,
  updateTos,
} from "../../api/tosApi.jsx";
import "./invoice.css";

const emptyForm = { title: "", content: "" };

function stripHtml(value = "") {
  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default function TermOfServices() {
  const [filter, setFilter] = useState("active");
  const [tos, setTos] = useState([]);
  const [expandedId, setExpandedId] = useState("");
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isEditing = Boolean(editingId);

  const loadTos = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getTosList({ filter });
      if (!response?.success)
        throw new Error(response?.message || "Failed to load Term of Services");
      setTos(response.data?.tos || []);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err.message ||
          "Failed to load Term of Services",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTos();
  }, [filter]);

  const counts = useMemo(
    () => ({
      total: tos.length,
      expanded: expandedId ? 1 : 0,
    }),
    [tos.length, expandedId],
  );

  const resetForm = () => {
    setEditingId("");
    setForm(emptyForm);
  };

  const editItem = (item) => {
    setEditingId(item._id);
    setForm({ title: item.title || "", content: item.content || "" });
    setExpandedId(item._id);
  };

  const submitForm = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        title: form.title.trim(),
        content: form.content.trim(),
      };
      const response = isEditing
        ? await updateTos(editingId, payload)
        : await createTos(payload);
      if (!response?.success)
        throw new Error(response?.message || "Failed to save Term of Services");
      toast.success(
        isEditing ? "Term of Services updated" : "Term of Services created",
      );
      resetForm();
      await loadTos();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err.message ||
          "Failed to save Term of Services",
      );
    } finally {
      setSaving(false);
    }
  };

  const archiveItem = async (item) => {
    try {
      const response = await archiveTos(item._id);
      if (!response?.success)
        throw new Error(
          response?.message || "Failed to archive Term of Services",
        );
      toast.success("Term of Services archived");
      await loadTos();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err.message ||
          "Failed to archive Term of Services",
      );
    }
  };

  const unarchiveItem = async (item) => {
    try {
      const response = await unarchiveTos(item._id);
      if (!response?.success)
        throw new Error(
          response?.message || "Failed to unarchive Term of Services",
        );
      toast.success("Term of Services active again");
      await loadTos();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err.message ||
          "Failed to unarchive Term of Services",
      );
    }
  };

  const deleteItem = async (item) => {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    try {
      const response = await deleteTos(item._id);
      if (!response?.success)
        throw new Error(
          response?.message || "Failed to delete Term of Services",
        );
      toast.success("Term of Services deleted");
      if (editingId === item._id) resetForm();
      await loadTos();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err.message ||
          "Failed to delete Term of Services",
      );
    }
  };

  return (
    <div className="inv-page">
      <div className="inv-card inv-header">
        <div>
          <h1>Term of Services</h1>
          <div className="inv-sub">
            Template catatan dan ketentuan yang bisa dipakai di invoice.
          </div>
        </div>
        <div className="inv-actions">
          <button
            type="button"
            className={`inv-pill ${filter === "active" ? "active" : ""}`}
            onClick={() => setFilter("active")}
          >
            Active
          </button>
          <button
            type="button"
            className={`inv-pill ${filter === "archived" ? "active" : ""}`}
            onClick={() => setFilter("archived")}
          >
            Archived
          </button>
        </div>
      </div>

      {error ? <div className="inv-error">{error}</div> : null}

      <div className="inv-grid">
        <div className="inv-grid-4">
          <form className="inv-card" onSubmit={submitForm}>
            <div className="inv-section-title">
              {isEditing ? "Edit Term of Services" : "Create Term of Services"}
            </div>
            <label className="inv-label">Title</label>
            <input
              className="inv-input"
              value={form.title}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, title: event.target.value }))
              }
            />
            <label className="inv-label" style={{ marginTop: 12 }}>
              Content
            </label>
            <textarea
              className="inv-textarea inv-tos-editor"
              value={form.content}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, content: event.target.value }))
              }
            />
            <div className="inv-inline-actions" style={{ marginTop: 12 }}>
              <button type="submit" className="inv-btn" disabled={saving}>
                {isEditing ? "Save Changes" : "Save"}
              </button>
              {isEditing ? (
                <button
                  type="button"
                  className="inv-btn-ghost"
                  onClick={resetForm}
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </div>

        <div className="inv-grid-8">
          <div className="inv-card">
            <div
              className="inv-inline-actions"
              style={{ justifyContent: "space-between", marginBottom: 10 }}
            >
              <div className="inv-section-title" style={{ marginBottom: 0 }}>
                {filter === "archived" ? "Archived Terms" : "Active Terms"}
              </div>
              <div className="inv-sub">{counts.total} templates</div>
            </div>

            {loading ? (
              <div className="inv-sub">Loading Term of Services...</div>
            ) : null}
            {!loading && !tos.length ? (
              <div className="inv-empty">No Term of Services found.</div>
            ) : null}

            <div className="inv-tos-list">
              {tos.map((item) => {
                const expanded = expandedId === item._id;
                return (
                  <div className="inv-tos-item" key={item._id}>
                    <button
                      type="button"
                      className="inv-tos-title"
                      onClick={() => setExpandedId(expanded ? "" : item._id)}
                    >
                      <span>{expanded ? "▾" : "▸"}</span>
                      <strong>{item.title}</strong>
                    </button>
                    <div className="inv-tos-preview">
                      {stripHtml(item.content).slice(0, 150) || "-"}
                    </div>
                    {expanded ? (
                      <div
                        className="inv-tos-content"
                        dangerouslySetInnerHTML={{ __html: item.content }}
                      />
                    ) : null}
                    <div className="inv-inline-actions">
                      <button
                        type="button"
                        className="inv-btn-secondary"
                        onClick={() => editItem(item)}
                      >
                        Edit
                      </button>
                      {filter === "active" ? (
                        <button
                          type="button"
                          className="inv-btn-ghost"
                          onClick={() => archiveItem(item)}
                        >
                          Archive
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="inv-btn-ghost"
                          onClick={() => unarchiveItem(item)}
                        >
                          Unarchive
                        </button>
                      )}
                      <button
                        type="button"
                        className="inv-btn-danger"
                        onClick={() => deleteItem(item)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
