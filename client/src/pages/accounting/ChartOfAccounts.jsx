import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  getAccountsByType,
  getAccountDetail,
  createAccount,
  updateAccount,
  deleteAccount,
  getSubmenusByMasterType,
} from "../../api/accountingApi";

const TABS = ["Assets", "Liabilities", "Income", "Expenses", "Equity"];
const TAB_DISPLAY = { Assets: "Assets", Liabilities: "Liabilities & Credit Cards", Equity: "Equity", Income: "Income", Expenses: "Expenses" };

// Account types that show the currency field (conditional, matching samitbank)
const CURRENCY_TYPES = ["Assets", "Liabilities", "Equity"];

// Full currency list matching samitbank's currency_helper.php
const CURRENCIES = [
  { code: "USD", symbol: "$", name: "U.S. dollar" },
  { code: "CAD", symbol: "$", name: "Canadian dollar" },
  { code: "AED", symbol: "AED", name: "UAE dirham" },
  { code: "AFN", symbol: "؋", name: "Afghani" },
  { code: "ALL", symbol: "Lek", name: "Lek" },
  { code: "AMD", symbol: "֏", name: "Armenian dram" },
  { code: "ANG", symbol: "ƒ", name: "Netherlands Antillean guilder" },
  { code: "AOA", symbol: "Kz", name: "Kwanza" },
  { code: "ARS", symbol: "$", name: "Argentinian peso" },
  { code: "AUD", symbol: "$", name: "Australian dollar" },
  { code: "AWG", symbol: "ƒ", name: "Aruban florin" },
  { code: "AZN", symbol: "ман", name: "New Manat" },
  { code: "BAM", symbol: "KM", name: "Convertible Marks" },
  { code: "BBD", symbol: "$", name: "Barbados dollar" },
  { code: "BDT", symbol: "৳", name: "Taka" },
  { code: "BGN", symbol: "лв", name: "Lev" },
  { code: "BHD", symbol: "BD", name: "Bahraini dinar" },
  { code: "BIF", symbol: "FBu", name: "Burundi franc" },
  { code: "BMD", symbol: "$", name: "Bermuda dollar" },
  { code: "BND", symbol: "$", name: "Brunei dollar" },
  { code: "BOB", symbol: "$b", name: "Boliviano" },
  { code: "BRL", symbol: "R$", name: "Real" },
  { code: "BSD", symbol: "$", name: "Bahamian dollar" },
  { code: "BTN", symbol: "Nu.", name: "Ngultrum" },
  { code: "BWP", symbol: "P", name: "Pula" },
  { code: "BYR", symbol: "p.", name: "Belarussian rouble" },
  { code: "BZD", symbol: "BZ$", name: "Belize dollar" },
  { code: "CDF", symbol: "₣", name: "Franc congolais" },
  { code: "CHF", symbol: "CHF", name: "Swiss franc" },
  { code: "CLP", symbol: "$", name: "Chilean peso" },
  { code: "CNY", symbol: "¥", name: "Ren-Min-Bi yuan" },
  { code: "COP", symbol: "$", name: "Colombian peso" },
  { code: "CRC", symbol: "₡", name: "Costa Rican colon" },
  { code: "CUP", symbol: "₱", name: "Cuban peso" },
  { code: "CVE", symbol: "Esc", name: "Cape Verde escudo" },
  { code: "CZK", symbol: "Kč", name: "Czech koruna" },
  { code: "DJF", symbol: "₣", name: "Djibouti franc" },
  { code: "DKK", symbol: "kr", name: "Danish krone" },
  { code: "DOP", symbol: "RD$", name: "Dominican peso" },
  { code: "DZD", symbol: "د.ج", name: "Algerian dinar" },
  { code: "EGP", symbol: "E £", name: "Egyptian pound" },
  { code: "ERN", symbol: "Nfk", name: "Nakfa" },
  { code: "ETB", symbol: "Br", name: "Ethiopian birr" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "FJD", symbol: "$", name: "Fiji dollar" },
  { code: "GBP", symbol: "£", name: "Pound sterling" },
  { code: "GEL", symbol: "ლ", name: "Lari" },
  { code: "GHS", symbol: "GH¢", name: "Ghana cedi" },
  { code: "GMD", symbol: "D", name: "Dalasi" },
  { code: "GNF", symbol: "₣", name: "Guinean franc" },
  { code: "GTQ", symbol: "Q", name: "Quetzal" },
  { code: "GYD", symbol: "$", name: "Guyana dollar" },
  { code: "HKD", symbol: "$", name: "Hong Kong dollar" },
  { code: "HNL", symbol: "L", name: "Lempira" },
  { code: "HRK", symbol: "kn", name: "Kuna" },
  { code: "HTG", symbol: "G", name: "Haitian gourde" },
  { code: "HUF", symbol: "Ft", name: "Forint" },
  { code: "IDR", symbol: "Rp", name: "Rupiah" },
  { code: "ILS", symbol: "₪", name: "New Israeli sheqel" },
  { code: "INR", symbol: "₹", name: "Indian rupee" },
  { code: "IQD", symbol: "د.ع", name: "Iraqi dinar" },
  { code: "IRR", symbol: "﷼", name: "Iranian rial" },
  { code: "ISK", symbol: "kr", name: "Icelandic króna" },
  { code: "JMD", symbol: "J$", name: "Jamaican dollar" },
  { code: "JOD", symbol: "د.ا", name: "Jordanian dinar" },
  { code: "JPY", symbol: "¥", name: "Yen" },
  { code: "KES", symbol: "SH", name: "Kenyan shilling" },
  { code: "KGS", symbol: "лв", name: "Kyrgyz Som" },
  { code: "KHR", symbol: "៛", name: "Riel" },
  { code: "KMF", symbol: "₣", name: "Comoro franc" },
  { code: "KRW", symbol: "₩", name: "Won" },
  { code: "KWD", symbol: "د.ك", name: "Kuwaiti dinar" },
  { code: "KYD", symbol: "$", name: "Cayman Islands dollar" },
  { code: "KZT", symbol: "лв", name: "Tenge" },
  { code: "LAK", symbol: "₭", name: "Kip" },
  { code: "LBP", symbol: "LBP", name: "Lebanese pound" },
  { code: "LKR", symbol: "₨", name: "Sri Lankan rupee" },
  { code: "LRD", symbol: "$", name: "Liberian dollar" },
  { code: "LSL", symbol: "M", name: "Loti" },
  { code: "LYD", symbol: "ل.د", name: "Libyan dinar" },
  { code: "MAD", symbol: "د.م", name: "Moroccan dirham" },
  { code: "MDL", symbol: "L", name: "Moldovan leu" },
  { code: "MGA", symbol: "Ar", name: "Malagasy Ariary" },
  { code: "MKD", symbol: "ден", name: "Denar" },
  { code: "MMK", symbol: "K", name: "Kyat" },
  { code: "MNT", symbol: "₮", name: "Tugrik" },
  { code: "MOP", symbol: "MOP$", name: "Pataca" },
  { code: "MRU", symbol: "UM", name: "Ouguiya" },
  { code: "MUR", symbol: "₨", name: "Mauritian rupee" },
  { code: "MVR", symbol: "Rf", name: "Rufiyaa" },
  { code: "MWK", symbol: "MK", name: "Kwacha" },
  { code: "MXN", symbol: "$", name: "Mexican peso" },
  { code: "MYR", symbol: "RM", name: "Malaysian ringgit" },
  { code: "MZN", symbol: "MT", name: "Metical" },
  { code: "NAD", symbol: "N$", name: "Namibian dollar" },
  { code: "NGN", symbol: "₦", name: "Naira" },
  { code: "NIO", symbol: "C$", name: "Cordoba Oro" },
  { code: "NOK", symbol: "kr", name: "Norwegian krone" },
  { code: "NPR", symbol: "₨", name: "Nepalese rupee" },
  { code: "NZD", symbol: "$", name: "New Zealand dollar" },
  { code: "OMR", symbol: "﷼", name: "Omani rial" },
  { code: "PAB", symbol: "B/.", name: "Balboa" },
  { code: "PEN", symbol: "S/.", name: "Nuevo Sol" },
  { code: "PGK", symbol: "K", name: "Kina" },
  { code: "PHP", symbol: "Php", name: "Philippine peso" },
  { code: "PKR", symbol: "₨", name: "Pakistani rupee" },
  { code: "PLN", symbol: "zł", name: "Zloty" },
  { code: "PYG", symbol: "Gs", name: "Guarani" },
  { code: "QAR", symbol: "﷼", name: "Qatari riyal" },
  { code: "RON", symbol: "lei", name: "New Leu" },
  { code: "RSD", symbol: "Дін.", name: "Serbian dinar" },
  { code: "RUB", symbol: "руб", name: "Russian rouble" },
  { code: "RWF", symbol: "R₣", name: "Rwanda franc" },
  { code: "SAR", symbol: "﷼", name: "Saudi riyal" },
  { code: "SBD", symbol: "SI$", name: "Solomon Islands dollar" },
  { code: "SCR", symbol: "₨", name: "Seychelles rupee" },
  { code: "SDG", symbol: "£", name: "Sudanese pound" },
  { code: "SEK", symbol: "kr", name: "Swedish krona" },
  { code: "SGD", symbol: "$", name: "Singapore dollar" },
  { code: "SHP", symbol: "£", name: "Saint Helena pound" },
  { code: "SLL", symbol: "Le", name: "Leone" },
  { code: "SOS", symbol: "S", name: "Somali shilling" },
  { code: "SRD", symbol: "$", name: "Surinam dollar" },
  { code: "SSP", symbol: "£", name: "South Sudanese pound" },
  { code: "THB", symbol: "฿", name: "Baht" },
  { code: "TJS", symbol: "SM", name: "Somoni" },
  { code: "TND", symbol: "TND", name: "Tunisian dinar" },
  { code: "TOP", symbol: "$", name: "Pa'anga" },
  { code: "TRY", symbol: "TL", name: "Turkish lira" },
  { code: "TTD", symbol: "TT$", name: "Trinidad and Tobago dollar" },
  { code: "TWD", symbol: "NT$", name: "New Taiwan dollar" },
  { code: "TZS", symbol: "Sh", name: "Tanzanian shilling" },
  { code: "UAH", symbol: "₴", name: "Hryvnia" },
  { code: "UGX", symbol: "UGX", name: "Ugandan shilling" },
  { code: "UYU", symbol: "$U", name: "Uruguayo peso" },
  { code: "UZS", symbol: "лв", name: "Uzbekistan sum" },
  { code: "VEF", symbol: "Bs", name: "Bolivar Fuerte" },
  { code: "VND", symbol: "₫", name: "Dong" },
  { code: "VUV", symbol: "VT", name: "Vatu" },
  { code: "WST", symbol: "$", name: "Samoan Tala" },
  { code: "XAF", symbol: "Fr", name: "CFA Franc - BEAC" },
  { code: "XCD", symbol: "$", name: "Eastern Caribbean dollar" },
  { code: "XOF", symbol: "CFA", name: "CFA franc - BCEAO" },
  { code: "XPF", symbol: "₣", name: "Comptoirs Francais du Pacifique Francs" },
  { code: "YER", symbol: "﷼", name: "Yemeni rial" },
  { code: "ZAR", symbol: "R", name: "Rand" },
  { code: "ZMW", symbol: "ZK", name: "Kwacha" },
  { code: "ZWD", symbol: "Z$", name: "Zimbabwean dollar" },
];

/** Get currency symbol from code (handles legacy "Rp" values too) */
const getCurrencySymbol = (currency) => {
  if (!currency) return "Rp";
  const found = CURRENCIES.find((c) => c.code === currency);
  return found ? found.symbol : currency;
};

const normalizeMasterType = (rawType) => {
  if (!rawType || typeof rawType !== "string") return null;
  const decoded = decodeURIComponent(rawType).replace(/\+/g, " ").trim();
  if (TABS.includes(decoded)) return decoded;

  const key = decoded.toLowerCase();
  if (key === "liabilities & credit cards") return "Liabilities";
  if (key === "liabilities") return "Liabilities";
  if (key === "assets") return "Assets";
  if (key === "income") return "Income";
  if (key === "expenses") return "Expenses";
  if (key === "equity") return "Equity";
  return null;
};

export default function ChartOfAccounts() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const isLegacyPath = location.pathname.startsWith("/chart-of-accounts");

  const [currentType, setCurrentType] = useState("Assets");
  const [accountCounts, setAccountCounts] = useState({});
  const [accountsBySubtype, setAccountsBySubtype] = useState({});
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [submenus, setSubmenus] = useState([]);
  const [loadingSubmenus, setLoadingSubmenus] = useState(false);
  const [form, setForm] = useState({
    masterType: "",
    accountName: "",
    submenuId: "",
    accountCode: "",
    currency: "",
    description: "",
  });

  // Dropdown state
  const [openDropdown, setOpenDropdown] = useState(null);
  const dropdownRef = useRef(null);
  const handledLegacyPathRef = useRef("");
  const deletingFromLegacyRef = useRef(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAccountsByType(currentType);
      if (res.success) {
        setAccountCounts(res.accountCounts || {});
        setAccountsBySubtype(res.accountsBySubtype || {});
      }
    } catch {
      toast.error("Failed to load chart of accounts");
    } finally {
      setLoading(false);
    }
  }, [currentType]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Keep active tab synced when legacy route includes account type
  useEffect(() => {
    const typeFromPath = normalizeMasterType(params.type);
    const typeFromQuery = normalizeMasterType(new URLSearchParams(location.search).get("type"));
    const nextType = typeFromPath || typeFromQuery;
    if (nextType && nextType !== currentType) {
      setCurrentType(nextType);
    }
  }, [params.type, location.search, currentType]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpenDropdown(null);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const openCreateModal = async (options = {}) => {
    const resolvedOptions =
      typeof options === "string"
        ? { submenuId: options }
        : options;
    const submenuId = resolvedOptions.submenuId || "";
    const masterType = normalizeMasterType(resolvedOptions.masterType) || currentType;
    const submenuName = resolvedOptions.submenuName || "";

    setEditingAccount(null);
    const defaultType = masterType;
    setForm({
      masterType: defaultType,
      accountName: "",
      submenuId,
      accountCode: "",
      currency: "",
      description: "",
    });

    setLoadingSubmenus(true);
    try {
      const res = await getSubmenusByMasterType(defaultType);
      const fetchedSubmenus = res.data || [];
      setSubmenus(fetchedSubmenus);

      if (!submenuId && submenuName) {
        const matchedSubmenu = fetchedSubmenus.find((s) => s.submenuName === submenuName);
        if (matchedSubmenu) {
          setForm((prev) => ({ ...prev, submenuId: matchedSubmenu._id }));
        }
      }
    } catch { setSubmenus([]); }
    setLoadingSubmenus(false);
    setOpenDropdown(null);
    setShowModal(true);
  };

  const openEditModal = async (acc, submenuName, masterType = currentType) => {
    setEditingAccount({ ...acc, _submenuName: submenuName, _masterType: masterType });
    setForm({
      masterType: masterType,
      accountName: acc.accountName,
      submenuId: acc.submenuId?._id || acc.submenuId,
      accountCode: acc.accountCode || "",
      currency: acc.currency || "",
      description: acc.description || "",
    });
    setSubmenus([]);
    setOpenDropdown(null);
    setShowModal(true);
  };

  const handleTabChange = (newType) => {
    setCurrentType(newType);
    if (isLegacyPath) {
      navigate(`/chart-of-accounts/${encodeURIComponent(newType)}`, { replace: true });
    }
  };

  /** Handle Account Type change in Create mode — reloads submenus */
  const handleMasterTypeChange = async (newType) => {
    setForm((prev) => ({
      ...prev,
      masterType: newType,
      submenuId: "",
      currency: CURRENCY_TYPES.includes(newType) ? (prev.currency || "") : "",
    }));
    if (!newType) { setSubmenus([]); return; }
    setLoadingSubmenus(true);
    try {
      const res = await getSubmenusByMasterType(newType);
      setSubmenus(res.data || []);
    } catch { setSubmenus([]); }
    setLoadingSubmenus(false);
  };

  // Legacy route behavior to mirror samitbank URL patterns
  useEffect(() => {
    if (!isLegacyPath) return;

    const pathKey = `${location.pathname}${location.search}`;
    const isLegacyActionPath = /^\/chart-of-accounts\/(create|edit\/[^/]+|delete\/[^/]+)$/.test(
      location.pathname
    );

    if (!isLegacyActionPath) {
      handledLegacyPathRef.current = "";
      return;
    }

    if (handledLegacyPathRef.current === pathKey) return;

    const createMatch = location.pathname === "/chart-of-accounts/create";
    if (createMatch) {
      handledLegacyPathRef.current = pathKey;
      const paramsQuery = new URLSearchParams(location.search);
      const requestedType = normalizeMasterType(paramsQuery.get("type")) || currentType;
      const requestedSubtype = paramsQuery.get("subtype") || "";

      if (requestedType !== currentType) {
        setCurrentType(requestedType);
      }
      openCreateModal({
        masterType: requestedType,
        submenuName: requestedSubtype,
      });
      return;
    }

    const editMatch = location.pathname.match(/^\/chart-of-accounts\/edit\/([^/]+)$/);
    if (editMatch?.[1]) {
      handledLegacyPathRef.current = pathKey;
      const accountId = editMatch[1];

      (async () => {
        try {
          const res = await getAccountDetail(accountId);
          const account = res?.data;
          if (!res?.success || !account) {
            toast.error("Account not found");
            navigate("/chart-of-accounts", { replace: true });
            return;
          }

          const masterType =
            normalizeMasterType(account?.submenuId?.masterId?.masterName) || currentType;
          const submenuName = account?.submenuId?.submenuName || "";
          if (masterType !== currentType) {
            setCurrentType(masterType);
          }
          openEditModal(account, submenuName, masterType);
        } catch {
          toast.error("Failed to load account detail");
          navigate("/chart-of-accounts", { replace: true });
        }
      })();

      return;
    }

    const deleteMatch = location.pathname.match(/^\/chart-of-accounts\/delete\/([^/]+)$/);
    if (deleteMatch?.[1] && !deletingFromLegacyRef.current) {
      handledLegacyPathRef.current = pathKey;
      deletingFromLegacyRef.current = true;
      const accountId = deleteMatch[1];

      (async () => {
        try {
          const detailRes = await getAccountDetail(accountId);
          const masterType =
            normalizeMasterType(detailRes?.data?.submenuId?.masterId?.masterName) || currentType;
          await handleDelete(accountId, { skipConfirm: true });
          navigate(`/chart-of-accounts/${encodeURIComponent(masterType)}`, { replace: true });
        } finally {
          deletingFromLegacyRef.current = false;
        }
      })();
    }
  }, [location.pathname, location.search, isLegacyPath, currentType]);

  const openCreateFromUi = (submenuId = "", submenuName = "") => {
    if (isLegacyPath) {
      const paramsQuery = new URLSearchParams({ type: currentType });
      if (submenuName) paramsQuery.set("subtype", submenuName);
      navigate(`/chart-of-accounts/create?${paramsQuery.toString()}`);
      return;
    }
    openCreateModal({ submenuId, submenuName, masterType: currentType });
  };

  const openEditFromUi = (account, submenuName) => {
    if (isLegacyPath) {
      navigate(`/chart-of-accounts/edit/${account._id}`);
      return;
    }
    openEditModal(account, submenuName, currentType);
  };

  const deleteFromUi = async (accountId) => {
    if (isLegacyPath) {
      const confirmed = confirm("Are you sure you want to delete this account?");
      if (!confirmed) return;
      navigate(`/chart-of-accounts/delete/${accountId}`);
      return;
    }
    await handleDelete(accountId);
  };

  const closeModal = () => {
    setShowModal(false);
    if (isLegacyPath && /\/chart-of-accounts\/(create|edit\/)/.test(location.pathname)) {
      navigate(`/chart-of-accounts/${encodeURIComponent(currentType)}`, { replace: true });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        accountName: form.accountName,
        submenuId: form.submenuId,
        accountCode: form.accountCode,
        currency: form.currency,
        description: form.description,
      };
      if (editingAccount) {
        const res = await updateAccount(editingAccount._id, payload);
        if (res.success) toast.success("Account updated");
      } else {
        const res = await createAccount(payload);
        if (res.success) toast.success("Account created");
      }

      const targetType =
        (editingAccount?._masterType || form.masterType || currentType);

      setShowModal(false);
      fetchData();

      if (isLegacyPath && /\/chart-of-accounts\/(create|edit\/)/.test(location.pathname)) {
        navigate(`/chart-of-accounts/${encodeURIComponent(targetType)}`, { replace: true });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save");
    }
  };

  const handleDelete = async (id, options = {}) => {
    const skipConfirm = options.skipConfirm === true;
    if (!skipConfirm && !confirm("Are you sure you want to delete this account?")) return false;
    try {
      const res = await deleteAccount(id);
      if (res.success) {
        toast.success("Account deleted");
        setOpenDropdown(null);
        fetchData();
        return true;
      }
      return false;
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
      return false;
    }
  };

  const formatBalance = (balance, currency = "Rp") => {
    const num = parseFloat(balance) || 0;
    const symbol = getCurrencySymbol(currency);
    return `${symbol} ${num.toLocaleString("id-ID", { minimumFractionDigits: 0 })}`;
  };

  // Check if an account code indicates a child (e.g. "1001.1")
  const isChildAccount = (code) => code && code.includes(".");

  // Determine which master type to check for currency visibility
  const effectiveMasterType = editingAccount ? editingAccount._masterType : form.masterType;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Breadcrumb header card */}
      <div className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-xl px-6 py-4 mb-6 border border-pink-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <nav className="text-xs text-gray-500 mb-1">
              <span>Accounting</span>
              <span className="mx-1.5">/</span>
              <span className="text-pink-700 font-medium">Chart of Accounts</span>
            </nav>
            <h1 className="text-xl font-bold text-gray-900">Chart of Accounts</h1>
          </div>
          <button onClick={() => openCreateFromUi()}
            className="px-5 py-2.5 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition text-sm font-medium shadow-sm">
            + Add a New Account
          </button>
        </div>
      </div>

      {/* Centered Pill Tabs */}
      <div className="flex justify-center mb-8">
        <div className="relative flex items-center">
          {/* Decorative lines */}
          <div className="hidden sm:block w-12 h-px bg-gray-300 mr-3" />
          <div className="inline-flex bg-pink-50 rounded-full p-1 gap-0.5">
            {TABS.map((tab) => (
              <button key={tab} onClick={() => handleTabChange(tab)}
                className={`relative px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                  currentType === tab
                    ? "bg-white text-pink-700 shadow-[0_0_9px_1px_rgba(236,72,153,0.2)]"
                    : "text-pink-600 hover:text-pink-800"
                }`}>
                {TAB_DISPLAY[tab] || tab}
                <span className={`ml-1.5 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold ${
                  currentType === tab
                    ? "bg-pink-100 text-pink-700"
                    : "bg-pink-100/60 text-pink-500"
                }`}>
                  {accountCounts[tab] || 0}
                </span>
              </button>
            ))}
          </div>
          <div className="hidden sm:block w-12 h-px bg-gray-300 ml-3" />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-3 border-pink-200 border-t-pink-600 rounded-full animate-spin" />
        </div>
      ) : Object.keys(accountsBySubtype).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 rounded-full bg-pink-50 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-1">No accounts for {currentType}</h3>
          <p className="text-sm text-gray-500 mb-4">Start by adding your first account in this category.</p>
          <button onClick={() => openCreateFromUi()}
            className="px-5 py-2.5 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition text-sm font-medium shadow-sm">
            + Add a New Account
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(accountsBySubtype).map(([submenuName, data]) => (
            <div key={submenuName} className="bg-white rounded-xl shadow-[0_0_10px_rgba(0,0,0,0.06)] border border-gray-100 overflow-hidden">
              {/* Section Header */}
              <div className="bg-gray-50 px-6 py-3.5 border-b border-gray-100">
                <h3 className="font-bold text-gray-800 text-[15px]">{submenuName}</h3>
              </div>

              {/* Account Items */}
              {data.accounts && data.accounts.length > 0 ? (
                <div>
                  {data.accounts.map((acc) => {
                    const isChild = isChildAccount(acc.accountCode);
                    return (
                      <div key={acc._id}
                        className={`flex items-center justify-between px-6 py-4 border-b border-gray-50 last:border-b-0 hover:bg-pink-50/20 transition ${
                          isChild ? "pl-12 bg-gray-50/50" : ""
                        }`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            {isChild && <span className="text-gray-300 text-sm font-mono select-none">└─</span>}
                            <span className="font-mono text-xs text-gray-400 shrink-0">{acc.accountCode || "-"}</span>
                            <span className="font-semibold text-gray-900">{acc.accountName}</span>
                            <span className="text-xs text-gray-400">({acc.currency || "Rp"})</span>
                          </div>
                          <p className={`text-xs text-gray-400 mt-0.5 ${isChild ? "ml-9" : "ml-0"}`}>No transactions for this account</p>
                          {acc.description && (
                            <p className={`text-xs text-gray-400 mt-0.5 line-clamp-1 ${isChild ? "ml-9" : "ml-0"}`}>{acc.description}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-4 ml-4 shrink-0">
                          {/* Balance */}
                          <span className={`font-mono text-sm ${(acc.balance || 0) < 0 ? "text-red-600" : "text-gray-700"}`}>
                            {formatBalance(acc.balance, acc.currency)}
                          </span>

                          {/* Action Dropdown */}
                          <div className="relative" ref={openDropdown === acc._id ? dropdownRef : null}>
                            <button onClick={() => setOpenDropdown(openDropdown === acc._id ? null : acc._id)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition">
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z" />
                              </svg>
                            </button>
                            {openDropdown === acc._id && (
                              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20 min-w-[140px]">
                                <button onClick={() => openEditFromUi(acc, submenuName)}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition flex items-center gap-2">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                  Edit
                                </button>
                                <div className="border-t border-gray-100 my-1" />
                                <button onClick={() => deleteFromUi(acc._id)}
                                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition flex items-center gap-2">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="px-6 py-5 text-gray-400 text-sm italic">
                  You haven&apos;t added any {submenuName} accounts yet.
                </div>
              )}

              {/* Add account link at bottom of section */}
              <div className="px-6 py-3 border-t border-gray-50">
                <button onClick={() => openCreateFromUi(data.submenuId || "", submenuName)}
                  className="text-sm text-pink-600 hover:text-pink-800 font-medium transition">
                  + Add a new account
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== Modal for Create/Edit ===== */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editingAccount ? "Edit Account" : "Add a New Account"}</h2>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

              {/* --- Account Type --- */}
              {editingAccount ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Account Type</label>
                  <input type="text"
                    value={TAB_DISPLAY[editingAccount._masterType] || editingAccount._masterType}
                    disabled
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-gray-50 text-gray-500 cursor-not-allowed" />
                  <p className="text-xs text-gray-400 mt-1">Cannot be changed after creation</p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Account Type <span className="text-red-500">*</span>
                  </label>
                  <select value={form.masterType}
                    onChange={(e) => handleMasterTypeChange(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition"
                    required>
                    <option value="">Select one...</option>
                    {TABS.map((t) => (
                      <option key={t} value={t}>{TAB_DISPLAY[t] || t}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* --- Account Subtype (Submenu) --- */}
              {editingAccount ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Account Subtype</label>
                  <input type="text"
                    value={editingAccount._submenuName || ""}
                    disabled
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-gray-50 text-gray-500 cursor-not-allowed" />
                  <p className="text-xs text-gray-400 mt-1">Cannot be changed after creation</p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Account Subtype <span className="text-red-500">*</span>
                  </label>
                  <select value={form.submenuId}
                    onChange={(e) => setForm({ ...form, submenuId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition"
                    required
                    disabled={loadingSubmenus || !form.masterType}>
                    <option value="">
                      {loadingSubmenus ? "Loading..." : !form.masterType ? "Select account type first..." : "Select submenu..."}
                    </option>
                    {submenus.map((s) => (
                      <option key={s._id} value={s._id}>{s.submenuName}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Choose which submenu this account belongs to</p>
                </div>
              )}

              {/* --- Account Name --- */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Account Name <span className="text-red-500">*</span>
                </label>
                <input type="text" value={form.accountName}
                  onChange={(e) => setForm({ ...form, accountName: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition"
                  required minLength={3} placeholder="Enter account name" />
              </div>

              {/* --- Account Currency (conditional: Assets, Liabilities, Equity only) --- */}
              {CURRENCY_TYPES.includes(effectiveMasterType) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Account Currency</label>
                  <select value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition">
                    <option value="">Select currency...</option>
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} ({c.symbol}) - {c.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Select the currency for this account</p>
                </div>
              )}

              {/* --- Account ID --- */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Account ID</label>
                <input type="text" value={form.accountCode}
                  onChange={(e) => setForm({ ...form, accountCode: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition"
                  placeholder={editingAccount ? "Account code" : "Leave empty for auto-generation"} />
                <p className="text-xs text-gray-400 mt-1">
                  {editingAccount
                    ? "A unique identifier for this account"
                    : "Optional. A unique identifier for this account. Will be auto-generated if left empty."}
                </p>
              </div>

              {/* --- Description --- */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition resize-y"
                  rows={3} placeholder="Optional description of this account" />
              </div>

              {/* --- Form Actions --- */}
              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button type="button" onClick={closeModal}
                  className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
                  Cancel
                </button>
                <button type="submit"
                  className="px-5 py-2.5 text-sm font-medium text-white bg-pink-600 rounded-lg hover:bg-pink-700 transition shadow-sm">
                  {editingAccount ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
