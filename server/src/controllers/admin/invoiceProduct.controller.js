import { InvoiceProduct } from "../../models/invoiceProduct.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const normalizeString = (value) =>
  typeof value === "string" ? value.trim() : "";

const buildFilter = (filter = "active") => {
  if (filter === "archived") return { archived: true };
  if (filter === "all") return {};
  return { archived: false };
};

const buildProductPayload = (body) => {
  const title = normalizeString(body.title);
  const price = Number(body.price);
  const description = normalizeString(body.description);

  if (!title) {
    throw new ApiError(400, "Nama product wajib diisi");
  }

  if (
    body.price === "" ||
    body.price === null ||
    body.price === undefined ||
    !Number.isFinite(price) ||
    price < 0
  ) {
    throw new ApiError(400, "Harga product wajib diisi");
  }

  return { title, price, description };
};

export const getAllInvoiceProducts = asyncHandler(async (req, res) => {
  const filter = normalizeString(req.query.filter) || "active";
  const search = normalizeString(req.query.search);
  const query = buildFilter(filter);

  if (search) {
    const regex = new RegExp(
      search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
    query.$or = [{ title: regex }, { description: regex }];
  }

  const invoiceProducts = await InvoiceProduct.find(query)
    .sort({ archived: 1, title: 1, createdAt: -1 })
    .lean();

  res.status(200).json(
    new ApiResponse(200, {
      invoiceProducts,
      currentFilter: filter,
    }),
  );
});

export const getInvoiceProductById = asyncHandler(async (req, res) => {
  const invoiceProduct = await InvoiceProduct.findById(req.params.id).lean();

  if (!invoiceProduct) {
    throw new ApiError(404, "Product invoice tidak ditemukan");
  }

  res.status(200).json(new ApiResponse(200, invoiceProduct));
});

export const createInvoiceProduct = asyncHandler(async (req, res) => {
  const payload = buildProductPayload(req.body);
  const invoiceProduct = await InvoiceProduct.create({
    ...payload,
    archived: Boolean(req.body.archived),
    createdBy: req.user?.userId || null,
    updatedBy: req.user?.userId || null,
  });

  res
    .status(201)
    .json(
      new ApiResponse(201, invoiceProduct, "Product invoice berhasil dibuat"),
    );
});

export const updateInvoiceProduct = asyncHandler(async (req, res) => {
  const payload = buildProductPayload(req.body);
  const invoiceProduct = await InvoiceProduct.findByIdAndUpdate(
    req.params.id,
    {
      ...payload,
      updatedBy: req.user?.userId || null,
    },
    { new: true, runValidators: true },
  );

  if (!invoiceProduct) {
    throw new ApiError(404, "Product invoice tidak ditemukan");
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        invoiceProduct,
        "Product invoice berhasil diperbarui",
      ),
    );
});

export const archiveInvoiceProduct = asyncHandler(async (req, res) => {
  const invoiceProduct = await InvoiceProduct.findByIdAndUpdate(
    req.params.id,
    {
      archived: true,
      updatedBy: req.user?.userId || null,
    },
    { new: true },
  );

  if (!invoiceProduct) {
    throw new ApiError(404, "Product invoice tidak ditemukan");
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        invoiceProduct,
        "Product invoice berhasil diarsipkan",
      ),
    );
});

export const unarchiveInvoiceProduct = asyncHandler(async (req, res) => {
  const invoiceProduct = await InvoiceProduct.findByIdAndUpdate(
    req.params.id,
    {
      archived: false,
      updatedBy: req.user?.userId || null,
    },
    { new: true },
  );

  if (!invoiceProduct) {
    throw new ApiError(404, "Product invoice tidak ditemukan");
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        invoiceProduct,
        "Product invoice berhasil diaktifkan",
      ),
    );
});

export const deleteInvoiceProduct = asyncHandler(async (req, res) => {
  const invoiceProduct = await InvoiceProduct.findByIdAndDelete(
    req.params.id,
  ).lean();

  if (!invoiceProduct) {
    throw new ApiError(404, "Product invoice tidak ditemukan");
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, invoiceProduct, "Product invoice berhasil dihapus"),
    );
});
