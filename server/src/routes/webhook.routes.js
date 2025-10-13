import express from "express";
import { Savings } from "../models/savings.model.js";
import { Member } from "../models/member.model.js";
import { Product } from "../models/product.model.js";
import mongoose from "mongoose";

const router = express.Router();

// DOKU Checkout Webhook - No authentication needed  
router.post("/doku-checkout", async (req, res) => {
  try {
    console.log("DOKU Checkout Webhook received:", JSON.stringify(req.body, null, 2));

    const { order, transaction, channel } = req.body;

    if (!order || !transaction) {
      console.error("Missing required fields in DOKU webhook");
      return res.status(400).json({ message: "Missing required fields" });
    }

    const { invoice_number, amount } = order;
    const { status } = transaction;

    // Only process successful payments
    if (status !== "SUCCESS") {
      console.log(`Payment status ${status} for invoice ${invoice_number}, skipping`);
      return res.status(200).json({ message: "Webhook received" });
    }

    // Extract member UUID and period from invoice number
    // Format: SAV-{uuid}-P{period}-{timestamp}
    const invoiceParts = invoice_number.split("-");
    if (invoiceParts.length < 3 || invoiceParts[0] !== "SAV") {
      console.error("Invalid invoice format:", invoice_number);
      return res.status(400).json({ message: "Invalid invoice format" });
    }

    const memberUuid = invoiceParts[1];
    const periodMatch = invoice_number.match(/P(\d+)/);
    const installmentPeriod = periodMatch ? parseInt(periodMatch[1]) : 1;

    console.log(`Processing payment for UUID: ${memberUuid}, Period: ${installmentPeriod}, Amount: ${amount}`);

    // Find member by UUID (handle partial UUID from invoice)
    let member = await Member.findOne({ uuid: memberUuid });
    
    if (!member) {
      // Try to find by partial UUID (invoice might have truncated UUID)
      // For example: invoice has JPSB3714 but DB has JPSB37142
      const regex = new RegExp(`^${memberUuid}`);
      member = await Member.findOne({ uuid: regex });
      
      if (!member) {
        // Try alternative UUID format with -1234 suffix
        const altUuid = `${memberUuid}-1234`;
        member = await Member.findOne({ uuid: altUuid });
        
        if (!member) {
          // Last attempt - find by regex with suffix
          const regexWithSuffix = new RegExp(`^${memberUuid}.*(-1234)?$`);
          member = await Member.findOne({ uuid: regexWithSuffix });
          
          if (!member) {
            console.error(`Member not found for UUID: ${memberUuid} (tried regex and variants)`);
            return res.status(404).json({ message: "Member not found" });
          }
        }
      }
    }

    console.log(`Found member: ${member.name}, ID: ${member._id}`);

    // Get member's current product or use default
    let product;
    if (member.currentProductId) {
      product = await Product.findById(member.currentProductId);
    }
    
    // If no product, find or create a default one
    if (!product) {
      console.warn(`Member ${member.name} has no current product, using default`);
      
      // Find default product or first available
      product = await Product.findOne({ isActive: true }).sort({ name: 1 });
      
      if (!product) {
        // Create a default product if none exists
        product = await Product.create({
          name: "Simpanan Pokok",
          code: "SP001", 
          description: "Simpanan Pokok Anggota",
          type: "Setoran",
          isActive: true,
          createdBy: member._id
        });
        console.log("Created default product:", product.name);
      }
      
      // Update member with this product
      member.currentProductId = product._id;
      await member.save();
    }

    // Check if payment already exists (avoid duplicates)
    const existingSaving = await Savings.findOne({
      memberId: member._id,
      installmentPeriod: installmentPeriod,
      status: "Approved",
      description: { $regex: invoice_number }
    });

    if (existingSaving) {
      console.log(`Payment already exists for invoice ${invoice_number}`);
      return res.status(200).json({ message: "Payment already processed" });
    }

    // Create new savings record with Approved status
    const newSaving = new Savings({
      memberId: member._id,
      productId: product._id, // Use product._id instead of member.currentProductId
      type: "Setoran",
      amount: parseInt(amount),
      installmentPeriod: installmentPeriod,
      savingsDate: new Date(), // Add required savingsDate
      status: "Approved", // Auto-approve payment gateway transactions
      paymentMethod: channel ? channel.id : "Payment Gateway",
      description: `Payment via DOKU Checkout - Invoice: ${invoice_number}`,
      notes: `Auto-approved via DOKU webhook${channel ? ` - Channel: ${channel.id}` : ''}`,
      createdBy: member._id,
      approvedBy: member._id, // Use member._id as approver (ObjectId)
      approvedAt: new Date(),
      invoiceNumber: invoice_number // Store invoice number for reference
    });

    await newSaving.save();
    console.log(`Savings record created successfully: ${newSaving._id}`);

    // Success response to DOKU
    return res.status(200).json({
      message: "Payment processed successfully",
      savingId: newSaving._id
    });

  } catch (error) {
    console.error("Error processing DOKU webhook:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
});

// Alternative webhook for QRIS notifications (if needed)
router.post("/doku-qris", async (req, res) => {
  try {
    console.log("DOKU QRIS Webhook received:", JSON.stringify(req.body, null, 2));

    // QRIS has different notification format
    const {
      INVOICE,
      AMOUNT,
      TXNSTATUS,
      MERCHANTPAN,
      TRANSACTIONID,
      TXNDATE
    } = req.body;

    if (TXNSTATUS !== "S") {
      console.log(`QRIS Payment status ${TXNSTATUS} for invoice ${INVOICE}, skipping`);
      return res.status(200).json({ message: "Webhook received" });
    }

    // Extract member UUID and period from invoice number
    const invoiceParts = INVOICE.split("-");
    if (invoiceParts.length < 3 || invoiceParts[0] !== "SAVING") {
      console.error("Invalid QRIS invoice format:", INVOICE);
      return res.status(400).json({ message: "Invalid invoice format" });
    }

    const memberUuid = invoiceParts[1];
    const periodMatch = INVOICE.match(/P(\d+)/);
    const installmentPeriod = periodMatch ? parseInt(periodMatch[1]) : 1;

    // Find member
    let member = await Member.findOne({ uuid: memberUuid });
    if (!member) {
      const altUuid = `${memberUuid}-1234`;
      member = await Member.findOne({ uuid: altUuid });
    }

    if (!member) {
      console.error(`Member not found for QRIS payment: ${memberUuid}`);
      return res.status(404).json({ message: "Member not found" });
    }

    // Check for duplicate
    const existingSaving = await Savings.findOne({
      memberId: member._id,
      installmentPeriod: installmentPeriod,
      status: "Approved",
      description: { $regex: INVOICE }
    });

    if (existingSaving) {
      console.log(`QRIS Payment already exists for invoice ${INVOICE}`);
      return res.status(200).json({ message: "Payment already processed" });
    }

    // Create savings record
    const newSaving = new Savings({
      memberId: member._id,
      productId: member.currentProductId,
      type: "Setoran",
      amount: parseInt(AMOUNT),
      installmentPeriod: installmentPeriod,
      status: "Approved",
      paymentMethod: "QRIS",
      description: `Payment via QRIS - Invoice: ${INVOICE}`,
      notes: `Transaction ID: ${TRANSACTIONID}, Date: ${TXNDATE}`,
      createdBy: member._id,
      approvedBy: "DOKU QRIS System",
      approvedAt: new Date()
    });

    await newSaving.save();
    console.log(`QRIS Savings record created: ${newSaving._id}`);

    return res.status(200).json({
      message: "QRIS Payment processed successfully",
      savingId: newSaving._id
    });

  } catch (error) {
    console.error("Error processing DOKU QRIS webhook:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
});

export default router;
