import { SalesTax } from "../../models/salesTax.model.js";

/**
 * List all sales taxes
 */
export const getSalesTaxes = async (req, res) => {
  try {
    const filter = req.query.filter || "active";
    let query = {};

    if (filter === "active") query.isActive = true;
    else if (filter === "inactive") query.isActive = false;
    // filter === "all" → no filter

    const salesTaxes = await SalesTax.find(query).sort({ taxName: 1 });
    res.status(200).json({ success: true, data: salesTaxes, currentFilter: filter });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get sales tax detail
 */
export const getSalesTax = async (req, res) => {
  try {
    const tax = await SalesTax.findById(req.params.id);
    if (!tax) {
      return res.status(404).json({ success: false, message: "Sales tax not found" });
    }
    res.status(200).json({ success: true, data: tax });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Create sales tax
 */
export const createSalesTax = async (req, res) => {
  try {
    const { taxName, abbreviation, description, taxNumber, showTaxNumberOnInvoices, isRecoverable, isCompoundTax, taxRate } = req.body;

    if (!taxName || !abbreviation || taxRate === undefined) {
      return res.status(400).json({ success: false, message: "Tax name, abbreviation, dan tax rate wajib diisi" });
    }

    // Check abbreviation uniqueness
    const existing = await SalesTax.findOne({ abbreviation: abbreviation.toUpperCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: "Abbreviation sudah ada" });
    }

    const tax = await SalesTax.create({
      taxName,
      abbreviation: abbreviation.toUpperCase(),
      description: description || "",
      taxNumber: taxNumber || "",
      showTaxNumberOnInvoices: !!showTaxNumberOnInvoices,
      isRecoverable: !!isRecoverable,
      isCompoundTax: !!isCompoundTax,
      taxRate: parseFloat(taxRate),
      isActive: true,
    });

    res.status(201).json({ success: true, message: "Sales tax created successfully", data: tax });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update sales tax
 */
export const updateSalesTax = async (req, res) => {
  try {
    const tax = await SalesTax.findById(req.params.id);
    if (!tax) {
      return res.status(404).json({ success: false, message: "Sales tax not found" });
    }

    const { taxName, abbreviation, description, taxNumber, showTaxNumberOnInvoices, isRecoverable, isCompoundTax, taxRate } = req.body;

    // Check abbreviation uniqueness (excluding current)
    if (abbreviation && abbreviation.toUpperCase() !== tax.abbreviation) {
      const existing = await SalesTax.findOne({ abbreviation: abbreviation.toUpperCase(), _id: { $ne: tax._id } });
      if (existing) {
        return res.status(400).json({ success: false, message: "Abbreviation sudah ada" });
      }
    }

    tax.taxName = taxName || tax.taxName;
    tax.abbreviation = abbreviation ? abbreviation.toUpperCase() : tax.abbreviation;
    tax.description = description !== undefined ? description : tax.description;
    tax.taxNumber = taxNumber !== undefined ? taxNumber : tax.taxNumber;
    tax.showTaxNumberOnInvoices = showTaxNumberOnInvoices !== undefined ? !!showTaxNumberOnInvoices : tax.showTaxNumberOnInvoices;
    tax.isRecoverable = isRecoverable !== undefined ? !!isRecoverable : tax.isRecoverable;
    tax.isCompoundTax = isCompoundTax !== undefined ? !!isCompoundTax : tax.isCompoundTax;
    tax.taxRate = taxRate !== undefined ? parseFloat(taxRate) : tax.taxRate;

    await tax.save();
    res.status(200).json({ success: true, message: "Sales tax updated successfully", data: tax });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete sales tax
 */
export const deleteSalesTax = async (req, res) => {
  try {
    const tax = await SalesTax.findById(req.params.id);
    if (!tax) {
      return res.status(404).json({ success: false, message: "Sales tax not found" });
    }

    await SalesTax.findByIdAndDelete(tax._id);
    res.status(200).json({ success: true, message: "Sales tax deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Toggle active/inactive
 */
export const toggleSalesTax = async (req, res) => {
  try {
    const tax = await SalesTax.findById(req.params.id);
    if (!tax) {
      return res.status(404).json({ success: false, message: "Sales tax not found" });
    }

    tax.isActive = !tax.isActive;
    await tax.save();

    const message = tax.isActive ? "Sales tax activated successfully" : "Sales tax deactivated successfully";
    res.status(200).json({ success: true, message });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
