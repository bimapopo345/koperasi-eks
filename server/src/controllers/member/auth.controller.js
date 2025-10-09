import { Member } from "../../models/member.model.js";
import jwt from "jsonwebtoken";
import { asyncHandler } from "../../utils/asyncHandler.js";

// Generate JWT Token for Member
const generateToken = (memberId) => {
  return jwt.sign({ memberId }, process.env.JWT_SECRET || "your-secret-key", {
    expiresIn: "7d",
  });
};

// Member Login - UUID based authentication
export const loginMember = asyncHandler(async (req, res) => {
  const { uuid, password } = req.body;

  // Validasi input
  if (!uuid || !password) {
    return res.status(400).json({
      success: false,
      message: "UUID dan password harus diisi",
    });
  }

  try {
    // Cari member berdasarkan UUID
    const member = await Member.findOne({ uuid }).populate('user');

    if (!member) {
      return res.status(401).json({
        success: false,
        message: "UUID atau password salah",
      });
    }

    // Verifikasi password format: UUID-1234
    const expectedPassword = `${uuid}-1234`;
    
    if (password !== expectedPassword) {
      return res.status(401).json({
        success: false,
        message: "UUID atau password salah",
      });
    }

    // Generate JWT token
    const token = generateToken(member._id);

    // Return success response
    res.status(200).json({
      success: true,
      message: "Login berhasil",
      data: {
        member: {
          _id: member._id,
          uuid: member.uuid,
          name: member.name,
          gender: member.gender,
          phone: member.phone,
          city: member.city,
          completeAddress: member.completeAddress,
        },
        token,
      },
    });
  } catch (error) {
    console.error("Member login error:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
      error: error.message,
    });
  }
});

// Get Current Member
export const getCurrentMember = asyncHandler(async (req, res) => {
  try {
    const member = await Member.findById(req.member.memberId).populate('user');

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member tidak ditemukan",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        member: {
          _id: member._id,
          uuid: member.uuid,
          name: member.name,
          gender: member.gender,
          phone: member.phone,
          city: member.city,
          completeAddress: member.completeAddress,
        },
      },
    });
  } catch (error) {
    console.error("Get current member error:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
      error: error.message,
    });
  }
});

// Logout Member
export const logoutMember = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: "Logout berhasil",
  });
});