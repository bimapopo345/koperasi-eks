import mongoose from "mongoose";
import conf from "../conf/conf.js";
import { CoaMaster } from "../models/coaMaster.model.js";
import { CoaSubmenu } from "../models/coaSubmenu.model.js";

const masterData = [
  {
    masterName: "Assets",
    masterCode: "1000",
    description: "Resources owned by the organization",
  },
  {
    masterName: "Liabilities",
    masterCode: "2000",
    description: "Obligations owed by the organization",
  },
  {
    masterName: "Equity",
    masterCode: "3000",
    description: "Owner's interest in the organization",
  },
  {
    masterName: "Income",
    masterCode: "4000",
    description: "Revenue earned by the organization",
  },
  {
    masterName: "Expenses",
    masterCode: "5000",
    description: "Costs incurred by the organization",
  },
];

const submenuData = {
  Assets: [
    { submenuName: "Cash and Bank", submenuCode: "1100", description: "Cash on hand and bank accounts" },
    { submenuName: "Accounts Receivable", submenuCode: "1200", description: "Amounts owed to the organization" },
    { submenuName: "Other Current Assets", submenuCode: "1300", description: "Other short-term assets" },
    { submenuName: "Fixed Assets", submenuCode: "1400", description: "Long-term tangible assets" },
  ],
  Liabilities: [
    { submenuName: "Accounts Payable", submenuCode: "2100", description: "Amounts owed to vendors" },
    { submenuName: "Credit Card", submenuCode: "2200", description: "Credit card balances" },
    { submenuName: "Other Current Liabilities", submenuCode: "2300", description: "Other short-term obligations" },
    { submenuName: "Long Term Liabilities", submenuCode: "2400", description: "Long-term obligations" },
  ],
  Equity: [
    { submenuName: "Owner's Equity", submenuCode: "3100", description: "Owner's capital and investments" },
    { submenuName: "Retained Earnings", submenuCode: "3200", description: "Accumulated profits" },
  ],
  Income: [
    { submenuName: "Sales Revenue", submenuCode: "4100", description: "Revenue from sales" },
    { submenuName: "Other Income", submenuCode: "4200", description: "Non-operating income" },
  ],
  Expenses: [
    { submenuName: "Operating Expenses", submenuCode: "5100", description: "Day-to-day business expenses" },
    { submenuName: "Payroll Expenses", submenuCode: "5200", description: "Employee compensation" },
    { submenuName: "Other Expenses", submenuCode: "5300", description: "Non-operating expenses" },
  ],
};

const seedCOA = async () => {
  try {
    await mongoose.connect(conf.mongodbUri);
    console.log("Connected to MongoDB for COA seeding...");

    // Check if masters already exist
    const existingCount = await CoaMaster.countDocuments();
    if (existingCount > 0) {
      console.log(`COA Masters already exist (${existingCount} records). Skipping seed.`);
      await mongoose.disconnect();
      return;
    }

    // Insert masters
    const insertedMasters = await CoaMaster.insertMany(masterData);
    console.log(`Inserted ${insertedMasters.length} COA Masters`);

    // Insert submenus for each master
    let totalSubmenus = 0;
    for (const master of insertedMasters) {
      const subs = submenuData[master.masterName];
      if (subs) {
        const subDocs = subs.map((s) => ({
          ...s,
          masterId: master._id,
        }));
        await CoaSubmenu.insertMany(subDocs);
        totalSubmenus += subDocs.length;
      }
    }
    console.log(`Inserted ${totalSubmenus} COA Submenus`);

    console.log("COA seed completed successfully!");
    await mongoose.disconnect();
  } catch (error) {
    console.error("COA seed error:", error.message);
    process.exit(1);
  }
};

seedCOA();
