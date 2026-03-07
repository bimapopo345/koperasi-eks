import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import api from "../api/index.jsx";
import { API_URL } from "../api/config.js";

const initialForm = {
  title: "",
  beneficiaryName: "",
  usagePlan: "",
  description: "",
  notes: "",
  startDate: new Date().toISOString().slice(0, 10),
  collectUntil: "",
  disbursementDate: "",
  resetAt: "",
  isActive: true,
};

const currency = (amount) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount || 0);

const formatDate = (value, withTime = false) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
};

const Donations = () => {
  const [overview, setOverview] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState(null);
  const [filters, setFilters] = useState({
    status: "all",
    campaignId: "all",
    search: "",
  });
  const [formData, setFormData] = useState(initialForm);

  const loadData = async () => {
    setLoading(true);
    try {
      const [overviewRes, campaignsRes, donationsRes] = await Promise.all([
        api.get("/api/admin/donations/overview"),
        api.get("/api/admin/donation-campaigns"),
        api.get("/api/admin/donations?limit=100&page=1"),
      ]);

      setOverview(overviewRes.data?.data || null);
      setCampaigns(campaignsRes.data?.data || []);
      setDonations(donationsRes.data?.data?.donations || []);
    } catch (error) {
      console.error("Failed to load donation admin data:", error);
      toast.error(error.response?.data?.message || "Gagal memuat data donasi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredDonations = useMemo(() => {
    return donations.filter((donation) => {
      const statusMatch = filters.status === "all" || donation.status === filters.status;
      const campaignMatch =
        filters.campaignId === "all" ||
        donation.campaignId?._id === filters.campaignId ||
        donation.campaignId === filters.campaignId;
      const haystack = [
        donation.studentName,
        donation.studentUuid,
        donation.donationCode,
        donation.studentCode,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const searchMatch = !filters.search || haystack.includes(filters.search.toLowerCase());
      return statusMatch && campaignMatch && searchMatch;
    });
  }, [donations, filters]);

  const resetForm = () => {
    setEditingCampaignId(null);
    setFormData(initialForm);
  };

  const handleEditCampaign = (campaign) => {
    setEditingCampaignId(campaign._id);
    setFormData({
      title: campaign.title || "",
      beneficiaryName: campaign.beneficiaryName || "",
      usagePlan: campaign.usagePlan || "",
      description: campaign.description || "",
      notes: campaign.notes || "",
      startDate: campaign.startDate ? String(campaign.startDate).slice(0, 10) : "",
      collectUntil: campaign.collectUntil ? String(campaign.collectUntil).slice(0, 10) : "",
      disbursementDate: campaign.disbursementDate ? String(campaign.disbursementDate).slice(0, 10) : "",
      resetAt: campaign.resetAt ? String(campaign.resetAt).slice(0, 10) : "",
      isActive: Boolean(campaign.isActive),
    });
  };

  const handleSubmitCampaign = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      if (editingCampaignId) {
        await api.put(`/api/admin/donation-campaigns/${editingCampaignId}`, formData);
        toast.success("Campaign donasi berhasil diperbarui");
      } else {
        await api.post("/api/admin/donation-campaigns", formData);
        toast.success("Campaign donasi berhasil dibuat");
      }
      resetForm();
      await loadData();
    } catch (error) {
      console.error("Failed to save campaign:", error);
      toast.error(error.response?.data?.message || "Gagal menyimpan campaign");
    } finally {
      setSubmitting(false);
    }
  };

  const handleActivateCampaign = async (campaignId) => {
    try {
      await api.patch(`/api/admin/donation-campaigns/${campaignId}/activate`);
      toast.success("Campaign aktif berhasil diubah");
      await loadData();
    } catch (error) {
      console.error("Failed to activate campaign:", error);
      toast.error(error.response?.data?.message || "Gagal mengaktifkan campaign");
    }
  };

  const handleApproveDonation = async (donationId) => {
    try {
      await api.patch(`/api/admin/donations/${donationId}/approve`);
      toast.success("Donasi berhasil disetujui");
      await loadData();
    } catch (error) {
      console.error("Failed to approve donation:", error);
      toast.error(error.response?.data?.message || "Gagal menyetujui donasi");
    }
  };

  const handleRejectDonation = async (donationId) => {
    const rejectionReason = window.prompt("Alasan penolakan donasi:");
    if (rejectionReason === null) return;

    try {
      await api.patch(`/api/admin/donations/${donationId}/reject`, { rejectionReason });
      toast.success("Donasi berhasil ditolak");
      await loadData();
    } catch (error) {
      console.error("Failed to reject donation:", error);
      toast.error(error.response?.data?.message || "Gagal menolak donasi");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-pink-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-emerald-100">Donasi</p>
            <h1 className="mt-2 text-3xl font-bold">Campaign dan Rekap Donasi</h1>
            <p className="mt-2 max-w-2xl text-sm text-emerald-50">
              Kelola target donasi, tanggal reset/penyaluran, dan verifikasi transaksi manual dari student dashboard.
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
            <div className="text-xs uppercase tracking-[0.2em] text-emerald-100">Campaign Aktif</div>
            <div className="mt-1 text-lg font-semibold">{overview?.activeCampaign?.title || "Belum ada campaign aktif"}</div>
            <div className="text-sm text-emerald-50">
              {overview?.activeCampaign?.beneficiaryName || "Silakan buat campaign baru"}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Donasi Disetujui" value={currency(overview?.totals?.totalApprovedAmount)} tone="emerald" />
        <StatCard title="Donasi Pending" value={currency(overview?.totals?.totalPendingAmount)} tone="amber" />
        <StatCard title="Transaksi Approved" value={overview?.totals?.totalApprovedCount || 0} tone="cyan" />
        <StatCard title="Transaksi Pending" value={overview?.totals?.totalPendingCount || 0} tone="rose" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                {editingCampaignId ? "Edit Campaign" : "Buat Campaign Baru"}
              </h2>
              <p className="text-sm text-slate-500">
                Tentukan donasi dipakai untuk siapa, sampai kapan dikumpulkan, dan kapan reset/penyaluran dilakukan.
              </p>
            </div>
            {editingCampaignId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Batal Edit
              </button>
            )}
          </div>

          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmitCampaign}>
            <label className="block text-sm text-slate-700">
              Judul Campaign
              <input
                className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500"
                value={formData.title}
                onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))}
                required
              />
            </label>
            <label className="block text-sm text-slate-700">
              Tujuan Donasi
              <input
                className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500"
                value={formData.beneficiaryName}
                onChange={(event) => setFormData((prev) => ({ ...prev, beneficiaryName: event.target.value }))}
                required
              />
            </label>
            <label className="block text-sm text-slate-700">
              Mulai Pengumpulan
              <input
                type="date"
                className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500"
                value={formData.startDate}
                onChange={(event) => setFormData((prev) => ({ ...prev, startDate: event.target.value }))}
              />
            </label>
            <label className="block text-sm text-slate-700">
              Batas Pengumpulan
              <input
                type="date"
                className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500"
                value={formData.collectUntil}
                onChange={(event) => setFormData((prev) => ({ ...prev, collectUntil: event.target.value }))}
                required
              />
            </label>
            <label className="block text-sm text-slate-700">
              Tanggal Penyaluran
              <input
                type="date"
                className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500"
                value={formData.disbursementDate}
                onChange={(event) => setFormData((prev) => ({ ...prev, disbursementDate: event.target.value }))}
                required
              />
            </label>
            <label className="block text-sm text-slate-700">
              Reset Berikutnya
              <input
                type="date"
                className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500"
                value={formData.resetAt}
                onChange={(event) => setFormData((prev) => ({ ...prev, resetAt: event.target.value }))}
              />
            </label>
            <label className="md:col-span-2 block text-sm text-slate-700">
              Rencana Penggunaan
              <input
                className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500"
                value={formData.usagePlan}
                onChange={(event) => setFormData((prev) => ({ ...prev, usagePlan: event.target.value }))}
                placeholder="Misal: Paket sembako Ramadhan, santunan, beasiswa"
              />
            </label>
            <label className="md:col-span-2 block text-sm text-slate-700">
              Deskripsi
              <textarea
                className="mt-1 min-h-[110px] w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500"
                value={formData.description}
                onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
              />
            </label>
            <label className="md:col-span-2 block text-sm text-slate-700">
              Catatan Admin
              <textarea
                className="mt-1 min-h-[90px] w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500"
                value={formData.notes}
                onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </label>
            <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                checked={formData.isActive}
                onChange={(event) => setFormData((prev) => ({ ...prev, isActive: event.target.checked }))}
              />
              Jadikan campaign aktif
            </label>
            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Menyimpan..." : editingCampaignId ? "Simpan Perubahan" : "Buat Campaign"}
              </button>
            </div>
          </form>
        </section>

        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Rekap Bulanan</h2>
            <p className="mt-1 text-sm text-slate-500">Ringkasan donasi approved per bulan.</p>
            <div className="mt-4 grid gap-3">
              {(overview?.monthlyRecap || []).map((item) => (
                <div key={`${item._id?.year}-${item._id?.month}`} className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-900">
                    {String(item._id?.month || "").padStart(2, "0")}/{item._id?.year}
                  </div>
                  <div className="mt-1 text-lg font-bold text-emerald-700">{currency(item.total)}</div>
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.count} transaksi</div>
                </div>
              ))}
              {!overview?.monthlyRecap?.length && (
                <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
                  Belum ada transaksi donasi approved.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Campaign Tersimpan</h2>
            <div className="mt-4 space-y-3">
              {campaigns.map((campaign) => (
                <div key={campaign._id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900">{campaign.title}</h3>
                        {campaign.isActive && (
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                            Aktif
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{campaign.beneficiaryName}</p>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-slate-400">
                        <span>Collect s/d {formatDate(campaign.collectUntil)}</span>
                        <span>Disburse {formatDate(campaign.disbursementDate)}</span>
                        <span>Total {currency(campaign.totals?.approvedAmount)}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!campaign.isActive && (
                        <button
                          type="button"
                          onClick={() => handleActivateCampaign(campaign._id)}
                          className="rounded-xl border border-emerald-200 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
                        >
                          Aktifkan
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleEditCampaign(campaign)}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {!campaigns.length && (
                <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
                  Belum ada campaign donasi.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Daftar Donasi Student</h2>
            <p className="text-sm text-slate-500">Approval manual diperlukan untuk donasi yang diunggah lewat bukti transfer.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <input
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-emerald-500"
              placeholder="Cari nama / kode"
              value={filters.search}
              onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
            />
            <select
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-emerald-500"
              value={filters.status}
              onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
            >
              <option value="all">Semua Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
            <select
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-emerald-500"
              value={filters.campaignId}
              onChange={(event) => setFilters((prev) => ({ ...prev, campaignId: event.target.value }))}
            >
              <option value="all">Semua Campaign</option>
              {campaigns.map((campaign) => (
                <option key={campaign._id} value={campaign._id}>
                  {campaign.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Student</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Campaign</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Nominal</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Bukti / Invoice</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDonations.map((donation) => (
                <tr key={donation._id} className="align-top">
                  <td className="px-4 py-4 text-sm text-slate-700">
                    <div className="font-semibold text-slate-900">{donation.studentName}</div>
                    <div className="text-xs text-slate-500">{donation.studentCode}</div>
                    <div className="text-xs text-slate-400">{donation.donationCode}</div>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700">
                    <div className="font-medium text-slate-900">{donation.campaignId?.title || donation.campaignTitle || "-"}</div>
                    <div className="text-xs text-slate-500">{donation.beneficiaryName || donation.campaignId?.beneficiaryName || "-"}</div>
                    <div className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">{donation.source}</div>
                  </td>
                  <td className="px-4 py-4 text-sm font-semibold text-slate-900">
                    {currency(donation.amount)}
                    <div className="text-xs font-normal text-slate-500">{formatDate(donation.createdAt, true)}</div>
                  </td>
                  <td className="px-4 py-4 text-sm">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        donation.status === "Approved"
                          ? "bg-emerald-100 text-emerald-700"
                          : donation.status === "Rejected"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {donation.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700">
                    {donation.proofFile ? (
                      <a
                        href={`${API_URL}/uploads/donasi/${donation.proofFile}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-700 underline"
                      >
                        Lihat Bukti
                      </a>
                    ) : (
                      <span className="text-slate-400">Tidak ada bukti</span>
                    )}
                    <div className="mt-2 break-all text-xs text-slate-500">{donation.invoiceNumber || "-"}</div>
                  </td>
                  <td className="px-4 py-4 text-sm">
                    {donation.status === "Pending" ? (
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => handleApproveDonation(donation._id)}
                          className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectDonation(donation._id)}
                          className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Tidak ada aksi</span>
                    )}
                  </td>
                </tr>
              ))}
              {!filteredDonations.length && (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-sm text-slate-500">
                    Belum ada data donasi sesuai filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

const StatCard = ({ title, value, tone }) => {
  const toneClass = {
    emerald: "from-emerald-500/10 to-emerald-600/5 text-emerald-700",
    amber: "from-amber-500/10 to-amber-600/5 text-amber-700",
    cyan: "from-cyan-500/10 to-cyan-600/5 text-cyan-700",
    rose: "from-rose-500/10 to-rose-600/5 text-rose-700",
  }[tone];

  return (
    <div className={`rounded-3xl border border-slate-200 bg-gradient-to-br ${toneClass} p-5 shadow-sm`}>
      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{title}</div>
      <div className="mt-3 text-2xl font-bold">{value}</div>
    </div>
  );
};

export default Donations;
