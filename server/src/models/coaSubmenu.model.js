import mongoose from "mongoose";

const coaSubmenuSchema = new mongoose.Schema(
  {
    masterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CoaMaster",
      required: [true, "Master ID wajib diisi"],
    },
    submenuName: {
      type: String,
      required: [true, "Submenu name wajib diisi"],
      trim: true,
    },
    submenuCode: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

coaSubmenuSchema.index({ masterId: 1, submenuName: 1 }, { unique: true });

const CoaSubmenu = mongoose.model("CoaSubmenu", coaSubmenuSchema);

export { CoaSubmenu };
