import mongoose from "mongoose";
import conf from "../conf/conf.js";
import { User } from "../models/user.model.js";
import { Product } from "../models/product.model.js";
import { Savings } from "../models/savings.model.js";
import { Member } from "../models/member.model.js";
import { LoanProduct } from "../models/loanProduct.model.js";
import { Loan } from "../models/loan.model.js";
import { LoanPayment } from "../models/loanPayment.model.js";

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(conf.mongodbUri, {
      //options
    });
    console.log(
      `✅ MongoDB connected! DB Host: ${connectionInstance.connection.host}`
    );
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

export default connectDB;
export { User, Product, Savings, Member, LoanProduct, Loan, LoanPayment };
