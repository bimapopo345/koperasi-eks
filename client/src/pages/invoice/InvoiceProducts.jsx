import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  archiveInvoiceProduct,
  createInvoiceProduct,
  deleteInvoiceProduct,
  getInvoiceProducts,
  unarchiveInvoiceProduct,
  updateInvoiceProduct,
} from "../../api/invoiceProductApi.jsx";
import "./invoice.css";

const emptyForm = { title: "", price: "", description: "" };

const normalizeMoney = (value) => {
  if (value === "" || value === null || value === undefined) return "";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseMoneyInput = (value) => {
  if (value === "" || value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const raw = String(value)
    .replace(/[^\d,.-]/g, "")
    .trim();
  if (!raw) return "";

  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw.replace(/\./g, "");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatMoneyInput = (value) => {
  if (value === "" || value === null || value === undefined) return "";
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(normalizeMoney(value));
};

const formatMoney = (amount) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

function ProductPriceInput({ value, onChange }) {
  return (
    <input
      className="inv-input"
      type="text"
      inputMode="decimal"
      placeholder="0"
      value={formatMoneyInput(value)}
      onChange={(event) => onChange(parseMoneyInput(event.target.value))}
    />
  );
}

export default function InvoiceProducts() {
  const [filter, setFilter] = useState("active");
  const [products, setProducts] = useState([]);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isEditing = Boolean(editingId);

  const loadProducts = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getInvoiceProducts({ filter });
      if (!response?.success) {
        throw new Error(response?.message || "Failed to load products");
      }
      setProducts(response.data?.invoiceProducts || []);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err.message ||
          "Failed to load products",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [filter]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products;

    return products.filter((product) =>
      [product.title, product.description, product.price]
        .filter((value) => value !== null && value !== undefined)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [products, search]);

  const resetForm = () => {
    setEditingId("");
    setForm(emptyForm);
  };

  const editProduct = (product) => {
    setEditingId(product._id);
    setForm({
      title: product.title || "",
      price: product.price || 0,
      description: product.description || "",
    });
  };

  const submitForm = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        title: form.title.trim(),
        price: normalizeMoney(form.price),
        description: form.description.trim(),
      };
      const response = isEditing
        ? await updateInvoiceProduct(editingId, payload)
        : await createInvoiceProduct(payload);
      if (!response?.success) {
        throw new Error(response?.message || "Failed to save product");
      }
      toast.success(isEditing ? "Product updated" : "Product created");
      resetForm();
      await loadProducts();
    } catch (err) {
      setError(
        err?.response?.data?.message || err.message || "Failed to save product",
      );
    } finally {
      setSaving(false);
    }
  };

  const archiveProduct = async (product) => {
    try {
      const response = await archiveInvoiceProduct(product._id);
      if (!response?.success) {
        throw new Error(response?.message || "Failed to archive product");
      }
      toast.success("Product archived");
      await loadProducts();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err.message ||
          "Failed to archive product",
      );
    }
  };

  const unarchiveProduct = async (product) => {
    try {
      const response = await unarchiveInvoiceProduct(product._id);
      if (!response?.success) {
        throw new Error(response?.message || "Failed to unarchive product");
      }
      toast.success("Product active again");
      await loadProducts();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err.message ||
          "Failed to unarchive product",
      );
    }
  };

  const deleteProduct = async (product) => {
    if (!window.confirm(`Delete "${product.title}"?`)) return;
    try {
      const response = await deleteInvoiceProduct(product._id);
      if (!response?.success) {
        throw new Error(response?.message || "Failed to delete product");
      }
      toast.success("Product deleted");
      if (editingId === product._id) resetForm();
      await loadProducts();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err.message ||
          "Failed to delete product",
      );
    }
  };

  return (
    <div className="inv-page">
      <div className="inv-card inv-header">
        <div>
          <h1>Product Invoice</h1>
          <div className="inv-sub">
            Master product khusus untuk item invoice. Terpisah dari Product
            Simpanan.
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
              {isEditing ? "Edit Product" : "Create Product"}
            </div>
            <label className="inv-label">Product Name</label>
            <input
              className="inv-input"
              value={form.title}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, title: event.target.value }))
              }
            />
            <label className="inv-label" style={{ marginTop: 12 }}>
              Price
            </label>
            <ProductPriceInput
              value={form.price}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, price: value }))
              }
            />
            <label className="inv-label" style={{ marginTop: 12 }}>
              Description
            </label>
            <textarea
              className="inv-textarea"
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
              placeholder="Deskripsi yang akan masuk ke item invoice..."
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
                {filter === "archived"
                  ? "Archived Products"
                  : "Active Products"}
              </div>
              <div className="inv-sub">
                {filteredProducts.length} of {products.length} products
              </div>
            </div>

            <input
              className="inv-input"
              value={search}
              placeholder="Search product..."
              onChange={(event) => setSearch(event.target.value)}
              style={{ marginBottom: 12 }}
            />

            {loading ? (
              <div className="inv-sub">Loading products...</div>
            ) : null}
            {!loading && !filteredProducts.length ? (
              <div className="inv-empty">No products found.</div>
            ) : null}

            <div className="inv-tos-list">
              {filteredProducts.map((product) => (
                <div className="inv-tos-item" key={product._id}>
                  <div className="inv-line-top">
                    <div>
                      <div className="inv-tos-title" style={{ padding: 0 }}>
                        <strong>{product.title}</strong>
                      </div>
                      <div className="inv-tos-preview">
                        {product.description || "-"}
                      </div>
                    </div>
                    <div className="inv-section-title" style={{ margin: 0 }}>
                      {formatMoney(product.price)}
                    </div>
                  </div>
                  <div className="inv-inline-actions">
                    <button
                      type="button"
                      className="inv-btn-secondary"
                      onClick={() => editProduct(product)}
                    >
                      Edit
                    </button>
                    {filter === "active" ? (
                      <button
                        type="button"
                        className="inv-btn-ghost"
                        onClick={() => archiveProduct(product)}
                      >
                        Archive
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="inv-btn-ghost"
                        onClick={() => unarchiveProduct(product)}
                      >
                        Unarchive
                      </button>
                    )}
                    <button
                      type="button"
                      className="inv-btn-danger"
                      onClick={() => deleteProduct(product)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
