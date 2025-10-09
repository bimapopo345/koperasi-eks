import jwt from "jsonwebtoken";
import { Member } from "../models/member.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const verifyMemberToken = asyncHandler(async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token akses diperlukan",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
    
    if (!decoded.memberId) {
      return res.status(401).json({
        success: false,
        message: "Token tidak valid",
      });
    }

    const member = await Member.findById(decoded.memberId);
    
    if (!member) {
      return res.status(401).json({
        success: false,
        message: "Member tidak ditemukan",
      });
    }

    req.member = decoded;
    next();
  } catch (error) {
    console.error("Member token verification error:", error);
    return res.status(401).json({
      success: false,
      message: "Token tidak valid",
      error: error.message,
    });
  }
});