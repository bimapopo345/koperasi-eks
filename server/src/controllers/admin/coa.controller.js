import { CoaMaster } from "../../models/coaMaster.model.js";
import { CoaSubmenu } from "../../models/coaSubmenu.model.js";
import { CoaAccount } from "../../models/coaAccount.model.js";

// Account code ranges per master type
const CODE_RANGES = {
  Assets: 1000,
  Liabilities: 2000,
  Equity: 3000,
  Income: 4000,
  Expenses: 5000,
};

/**
 * Get all accounts grouped by master type (with counts)
 */
export const getAccountsByType = async (req, res) => {
  try {
    const type = req.params.type || "Assets";
    const validTypes = Object.keys(CODE_RANGES);
    const currentType = validTypes.includes(type) ? type : "Assets";

    // Get account counts for all types
    const accountCounts = {};
    for (const t of validTypes) {
      const master = await CoaMaster.findOne({ masterName: t, isActive: true });
      if (master) {
        const submenus = await CoaSubmenu.find({ masterId: master._id, isActive: true });
        const submenuIds = submenus.map((s) => s._id);
        accountCounts[t] = await CoaAccount.countDocuments({
          submenuId: { $in: submenuIds },
          isActive: true,
        });
      } else {
        accountCounts[t] = 0;
      }
    }

    // Get accounts grouped by submenu for current type
    const master = await CoaMaster.findOne({ masterName: currentType, isActive: true });
    let accountsBySubtype = {};

    if (master) {
      const submenus = await CoaSubmenu.find({ masterId: master._id, isActive: true }).sort({ submenuName: 1 });
      for (const sub of submenus) {
        const accounts = await CoaAccount.find({ submenuId: sub._id, isActive: true }).sort({ accountName: 1 });
        accountsBySubtype[sub.submenuName] = {
          submenuId: sub._id,
          accounts,
        };
      }
    }

    res.status(200).json({
      success: true,
      currentType,
      accountTypes: validTypes,
      accountCounts,
      accountsBySubtype,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get account detail
 */
export const getAccountDetail = async (req, res) => {
  try {
    const account = await CoaAccount.findById(req.params.id).populate({
      path: "submenuId",
      populate: { path: "masterId" },
    });

    if (!account) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }

    res.status(200).json({ success: true, data: account });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Create new account
 */
export const createAccount = async (req, res) => {
  try {
    const { accountName, submenuId, accountCode, currency, description } = req.body;

    if (!accountName || accountName.length < 3) {
      return res.status(400).json({ success: false, message: "Account name minimal 3 karakter" });
    }
    if (!submenuId) {
      return res.status(400).json({ success: false, message: "Submenu ID wajib diisi" });
    }

    // Get submenu with master info
    const submenu = await CoaSubmenu.findById(submenuId).populate("masterId");
    if (!submenu) {
      return res.status(400).json({ success: false, message: "Invalid submenu" });
    }

    // Generate or validate account code
    let finalCode = accountCode;
    if (!finalCode) {
      finalCode = await generateNextAccountCode(submenu.masterId.masterName);
    } else {
      const exists = await CoaAccount.findOne({ accountCode: finalCode });
      if (exists) {
        return res.status(400).json({ success: false, message: "Account code sudah ada" });
      }
    }

    const account = await CoaAccount.create({
      submenuId,
      accountCode: finalCode,
      accountName,
      currency: currency || "Rp",
      description: description || "",
      balance: 0,
      isActive: true,
    });

    res.status(201).json({ success: true, message: "Account created successfully", data: account });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update account
 */
export const updateAccount = async (req, res) => {
  try {
    const { accountName, accountCode, currency, description } = req.body;
    const account = await CoaAccount.findById(req.params.id);

    if (!account) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }

    // Check code uniqueness
    if (accountCode && accountCode !== account.accountCode) {
      const exists = await CoaAccount.findOne({ accountCode, _id: { $ne: account._id } });
      if (exists) {
        return res.status(400).json({ success: false, message: "Account code sudah ada" });
      }
    }

    account.accountName = accountName || account.accountName;
    account.accountCode = accountCode || account.accountCode;
    account.currency = currency || account.currency;
    account.description = description !== undefined ? description : account.description;
    await account.save();

    res.status(200).json({ success: true, message: "Account updated successfully", data: account });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Soft delete account
 */
export const deleteAccount = async (req, res) => {
  try {
    const account = await CoaAccount.findById(req.params.id);
    if (!account) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }

    account.isActive = false;
    await account.save();

    res.status(200).json({ success: true, message: "Account deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get submenus by master type
 */
export const getSubmenusByMasterType = async (req, res) => {
  try {
    const { masterType } = req.params;
    const master = await CoaMaster.findOne({ masterName: masterType, isActive: true });

    if (!master) {
      return res.status(404).json({ success: false, message: "Master type not found" });
    }

    const submenus = await CoaSubmenu.find({ masterId: master._id, isActive: true }).sort({ submenuName: 1 });
    res.status(200).json({ success: true, data: submenus });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get all categories (hierarchical) for transaction category select
 */
export const getAllCategories = async (req, res) => {
  try {
    const categories = [];
    const masters = await CoaMaster.find({ isActive: true }).sort({ masterName: 1 });

    for (const master of masters) {
      categories.push({ id: master._id, name: master.masterName, type: "master" });

      const submenus = await CoaSubmenu.find({ masterId: master._id, isActive: true }).sort({ submenuName: 1 });
      for (const sub of submenus) {
        categories.push({ id: sub._id, name: sub.submenuName, type: "submenu" });

        const accounts = await CoaAccount.find({ submenuId: sub._id, isActive: true }).sort({ accountName: 1 });
        for (const acc of accounts) {
          categories.push({ id: acc._id, name: acc.accountName, code: acc.accountCode || "", type: "account" });
        }
      }
    }

    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get all assets accounts (for dropdowns)
 */
export const getAssetsAccounts = async (req, res) => {
  try {
    const master = await CoaMaster.findOne({ masterName: "Assets", isActive: true });
    if (!master) {
      return res.status(200).json({ success: true, data: {} });
    }

    const submenus = await CoaSubmenu.find({ masterId: master._id, isActive: true }).sort({ submenuName: 1 });
    const grouped = {};
    for (const sub of submenus) {
      const accounts = await CoaAccount.find({ submenuId: sub._id, isActive: true }).sort({ accountName: 1 });
      grouped[sub.submenuName] = accounts;
    }

    res.status(200).json({ success: true, data: grouped });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Helper: generate next account code
 */
async function generateNextAccountCode(masterName) {
  const baseCode = CODE_RANGES[masterName] || 1000;
  const master = await CoaMaster.findOne({ masterName });
  if (!master) return baseCode + 1;

  const submenus = await CoaSubmenu.find({ masterId: master._id });
  const submenuIds = submenus.map((s) => s._id);

  const lastAccount = await CoaAccount.findOne({
    submenuId: { $in: submenuIds },
    accountCode: { $regex: /^\d+$/ },
  }).sort({ accountCode: -1 });

  if (lastAccount && !isNaN(lastAccount.accountCode)) {
    return String(parseInt(lastAccount.accountCode) + 1);
  }

  return String(baseCode + 1);
}
