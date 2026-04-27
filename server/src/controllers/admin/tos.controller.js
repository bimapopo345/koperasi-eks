import { Tos } from "../../models/tos.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const normalizeString = (value) => (typeof value === "string" ? value.trim() : "");

const buildFilter = (filter = "active") => {
  if (filter === "archived") return { archived: true };
  if (filter === "all") return {};
  return { archived: false };
};

export const getAllTos = asyncHandler(async (req, res) => {
  const filter = normalizeString(req.query.filter) || "active";
  const tos = await Tos.find(buildFilter(filter)).sort({ createdAt: -1 }).lean();

  res.status(200).json(
    new ApiResponse(200, {
      tos,
      currentFilter: filter,
    })
  );
});

export const getTosById = asyncHandler(async (req, res) => {
  const tos = await Tos.findById(req.params.id).lean();

  if (!tos) {
    throw new ApiError(404, "Term of Services tidak ditemukan");
  }

  res.status(200).json(new ApiResponse(200, tos));
});

export const createTos = asyncHandler(async (req, res) => {
  const title = normalizeString(req.body.title);
  const content = normalizeString(req.body.content);

  if (!title || !content) {
    throw new ApiError(400, "Title dan content wajib diisi");
  }

  const tos = await Tos.create({
    title,
    content,
    archived: Boolean(req.body.archived),
    createdBy: req.user?.userId || null,
    updatedBy: req.user?.userId || null,
  });

  res.status(201).json(new ApiResponse(201, tos, "Term of Services berhasil dibuat"));
});

export const updateTos = asyncHandler(async (req, res) => {
  const title = normalizeString(req.body.title);
  const content = normalizeString(req.body.content);

  if (!title || !content) {
    throw new ApiError(400, "Title dan content wajib diisi");
  }

  const tos = await Tos.findByIdAndUpdate(
    req.params.id,
    {
      title,
      content,
      updatedBy: req.user?.userId || null,
    },
    { new: true, runValidators: true }
  );

  if (!tos) {
    throw new ApiError(404, "Term of Services tidak ditemukan");
  }

  res.status(200).json(new ApiResponse(200, tos, "Term of Services berhasil diperbarui"));
});

export const archiveTos = asyncHandler(async (req, res) => {
  const tos = await Tos.findByIdAndUpdate(
    req.params.id,
    {
      archived: true,
      updatedBy: req.user?.userId || null,
    },
    { new: true }
  );

  if (!tos) {
    throw new ApiError(404, "Term of Services tidak ditemukan");
  }

  res.status(200).json(new ApiResponse(200, tos, "Term of Services berhasil diarsipkan"));
});

export const unarchiveTos = asyncHandler(async (req, res) => {
  const tos = await Tos.findByIdAndUpdate(
    req.params.id,
    {
      archived: false,
      updatedBy: req.user?.userId || null,
    },
    { new: true }
  );

  if (!tos) {
    throw new ApiError(404, "Term of Services tidak ditemukan");
  }

  res.status(200).json(new ApiResponse(200, tos, "Term of Services berhasil diaktifkan"));
});

export const deleteTos = asyncHandler(async (req, res) => {
  const tos = await Tos.findByIdAndDelete(req.params.id).lean();

  if (!tos) {
    throw new ApiError(404, "Term of Services tidak ditemukan");
  }

  res.status(200).json(new ApiResponse(200, tos, "Term of Services berhasil dihapus"));
});
