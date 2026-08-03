import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("[Seed] Starting database seed...");
  const adminPasswordHash = bcrypt.hashSync("admin123", 10);
  const customerPasswordHash = bcrypt.hashSync("customer123", 10);

  // 1. Upsert Admin (preserve existing accounts)
  const admin = await prisma.user.upsert({
    where: { email: "admin@saibabastores.com" },
    update: {},
    create: {
      name: "Sai Baba Stores Owner",
      email: "admin@saibabastores.com",
      phone: "9876543210",
      passwordHash: adminPasswordHash,
      role: Role.ADMIN
    }
  });
  console.log(`[Seed] Guaranteed Admin User: ${admin.email}`);

  // 2. Upsert Customer (preserve existing accounts)
  const customer = await prisma.user.upsert({
    where: { email: "customer@saibabastores.com" },
    update: {},
    create: {
      name: "Karthik R",
      email: "customer@saibabastores.com",
      phone: "9123456789",
      passwordHash: customerPasswordHash,
      role: Role.CUSTOMER
    }
  });
  console.log(`[Seed] Guaranteed Customer User: ${customer.email}`);

  // 3. Store Products
  const products: any[] = [
    // Bathing Soap
    { name: "Lux Rose Soap", price: 35, stockQty: 30, category: "Bathing Soap, Hygiene", imageUrl: "/products/bathing_soap_1.webp" },
    { name: "Santoor Sandal Soap", price: 38, stockQty: 25, category: "Bathing Soap, Hygiene", imageUrl: "/products/bathing_soap_2.webp" },
    { name: "Dettol Original Soap", price: 40, stockQty: 40, category: "Bathing Soap, Hygiene", imageUrl: "/products/bathing_soap_3.webp" },
    { name: "Dove Beauty Bar", price: 65, stockQty: 20, category: "Bathing Soap, Hygiene", imageUrl: "/products/bathing_soap_4.webp" },
    { name: "Pears Pure & Gentle", price: 55, stockQty: 18, category: "Bathing Soap, Hygiene", imageUrl: "/products/bathing_soap_5.webp" },
    { name: "Fiama Gel Soap", price: 45, stockQty: 15, category: "Bathing Soap, Hygiene", imageUrl: "/products/bathing_soap_6.webp" },
    { name: "Lifebuoy Total Soap", price: 28, stockQty: 35, category: "Bathing Soap, Hygiene", imageUrl: "/products/bathing_soap_7.webp" },
    { name: "Medimix Ayurvedic Soap", price: 32, stockQty: 22, category: "Bathing Soap, Hygiene", imageUrl: "/products/bathing_soap_8.webp" },
    { name: "Cinthol Lime Soap", price: 42, stockQty: 28, category: "Bathing Soap, Hygiene", imageUrl: "/products/bathing_soap_9.webp" },
    { name: "Godrej No.1 Sandal", price: 30, stockQty: 30, category: "Bathing Soap, Hygiene", imageUrl: "/products/bathing_soap_10.webp" },
    { name: "Mysore Sandal Soap", price: 75, stockQty: 12, category: "Bathing Soap, Hygiene", imageUrl: "/products/bathing_soap_11.webp" },
    { name: "Hamam Neem Soap", price: 34, stockQty: 25, category: "Bathing Soap, Hygiene", imageUrl: "/products/bathing_soap_12.webp" },
    { name: "Vivel Aloe Vera Soap", price: 36, stockQty: 20, category: "Bathing Soap, Hygiene", imageUrl: "/products/bathing_soap_13.webp" },
    { name: "Wild Stone Body Soap", price: 50, stockQty: 15, category: "Bathing Soap, Hygiene", imageUrl: "/products/bathing_soap_14.webp" },

    // Biscuits
    { name: "50 50 Classic Sweet & Salty", price: 5, stockQty: 10, category: "Biscuit, Snacks", imageUrl: "/products/biscuit_1.webp" },
    { name: "50 50 Classic Sweet & Salty (Pack)", price: 10, stockQty: 10, category: "Biscuit, Snacks", imageUrl: "/products/biscuit_2.webp" },
    { name: "50 50 Maska Chaska", price: 10, stockQty: 9, category: "Biscuit, Snacks", imageUrl: "/products/biscuit_3.webp" },
    { name: "Parle-G Gold Biscuit", price: 10, stockQty: 50, category: "Biscuit, Snacks", imageUrl: "/products/biscuit_4.webp" },
    { name: "Britannia Bourbon", price: 20, stockQty: 25, category: "Biscuit, Snacks", imageUrl: "/products/biscuit_5.webp" },
    { name: "Britannia Good Day Butter", price: 15, stockQty: 30, category: "Biscuit, Snacks", imageUrl: "/products/biscuit_6.webp" },
    { name: "Britannia Good Day Cashew", price: 25, stockQty: 20, category: "Biscuit, Snacks", imageUrl: "/products/biscuit_7.webp" },
    { name: "Sunfeast Dark Fantasy", price: 35, stockQty: 18, category: "Biscuit, Snacks", imageUrl: "/products/biscuit_8.webp" },
    { name: "Sunfeast Marie Light", price: 15, stockQty: 30, category: "Biscuit, Snacks", imageUrl: "/products/biscuit_9.webp" },
    { name: "Monaco Salted Crackers", price: 10, stockQty: 40, category: "Biscuit, Snacks", imageUrl: "/products/biscuit_10.webp" },
    { name: "Krackjack Biscuit", price: 10, stockQty: 35, category: "Biscuit, Snacks", imageUrl: "/products/biscuit_11.webp" },
    { name: "Britannia NutriChoice", price: 30, stockQty: 15, category: "Biscuit, Snacks", imageUrl: "/products/biscuit_12.webp" },
    { name: "Oreo Chocolate Cream", price: 30, stockQty: 25, category: "Biscuit, Snacks", imageUrl: "/products/biscuit_13.webp" },
    { name: "Unibic Choco Chip Cookies", price: 40, stockQty: 12, category: "Biscuit, Snacks", imageUrl: "/products/biscuit_14.webp" },

    // Detergents & Dress Washing
    { name: "Rin Detergent Bar", price: 15, stockQty: 40, category: "Dress Washing, Household", imageUrl: "/products/dress_washing_1.webp" },
    { name: "Surf Excel Easy Wash Powder", price: 65, stockQty: 20, category: "Dress Washing, Household", imageUrl: "/products/dress_washing_2.webp" },
    { name: "Tide Plus Extra Power", price: 55, stockQty: 25, category: "Dress Washing, Household", imageUrl: "/products/dress_washing_3.webp" },
    { name: "Ariel Matic Front Load Powder", price: 120, stockQty: 15, category: "Dress Washing, Household", imageUrl: "/products/dress_washing_4.webp" },
    { name: "Vim Dishwash Bar", price: 10, stockQty: 50, category: "Dress Washing, Household", imageUrl: "/products/dress_washing_5.webp" },
    { name: "Wheel Active Powder", price: 45, stockQty: 30, category: "Dress Washing, Household", imageUrl: "/products/dress_washing_6.webp" },
    { name: "Comfort Fabric Conditioner", price: 58, stockQty: 18, category: "Dress Washing, Household", imageUrl: "/products/dress_washing_7.webp" },
    { name: "Ala Fabric Bleach", price: 35, stockQty: 15, category: "Dress Washing, Household", imageUrl: "/products/dress_washing_8.webp" },

    // Dental Hygiene & Pastes
    { name: "Colgate Strong Teeth Paste", price: 55, stockQty: 30, category: "Paste, Oral Hygiene", imageUrl: "/products/paste_1.webp" },
    { name: "Colgate MaxFresh Red Gel", price: 60, stockQty: 25, category: "Paste, Oral Hygiene", imageUrl: "/products/paste_2.webp" },
    { name: "Close Up Ever Fresh Red", price: 58, stockQty: 20, category: "Paste, Oral Hygiene", imageUrl: "/products/paste_3.webp" },
    { name: "Sensodyne Repair & Protect", price: 110, stockQty: 12, category: "Paste, Oral Hygiene", imageUrl: "/products/paste_4.webp" },
    { name: "Pepsodent Germicheck", price: 48, stockQty: 28, category: "Paste, Oral Hygiene", imageUrl: "/products/paste_5.webp" },
    { name: "Dabur Red Ayurvedic Paste", price: 65, stockQty: 22, category: "Paste, Oral Hygiene", imageUrl: "/products/paste_6.webp" },
    { name: "Himalaya Complete Care Paste", price: 70, stockQty: 15, category: "Paste, Oral Hygiene", imageUrl: "/products/paste_7.webp" },
    { name: "Patanjali Dant Kanti", price: 50, stockQty: 35, category: "Paste, Oral Hygiene", imageUrl: "/products/paste_8.webp" },

    // Sanitary Care
    { name: "Stayfree Secure XL Cottony", price: 42, stockQty: 30, category: "Sanitary Pad, Hygiene", imageUrl: "/products/pad_1.webp" },
    { name: "Whisper Choice Ultra Wings", price: 48, stockQty: 25, category: "Sanitary Pad, Hygiene", imageUrl: "/products/pad_2.webp" },
    { name: "Whisper Bindazzz Nights", price: 95, stockQty: 15, category: "Sanitary Pad, Hygiene", imageUrl: "/products/pad_3.webp" },
    { name: "Sofy AntiBacteria XL", price: 85, stockQty: 18, category: "Sanitary Pad, Hygiene", imageUrl: "/products/pad_4.webp" },

    // Cigarettes / Restricted Tobacco Items (Placed at Bottom)
    { name: "American Club Cigarettes", price: 20, stockQty: 25, category: "Cigerette", imageUrl: "/products/cigerette_1.webp" },
    { name: "Gold Flake Kings", price: 18, stockQty: 30, category: "Cigerette", imageUrl: "/products/cigerette_2.webp" },
    { name: "Classic Milds", price: 18, stockQty: 30, category: "Cigerette", imageUrl: "/products/cigerette_3.webp" },
    { name: "Marlboro Light", price: 22, stockQty: 20, category: "Cigerette", imageUrl: "/products/cigerette_4.webp" },
    { name: "Capstan Filter", price: 12, stockQty: 40, category: "Cigerette", imageUrl: "/products/cigerette_5.webp" },
    { name: "Four Square Special", price: 15, stockQty: 25, category: "Cigerette", imageUrl: "/products/cigerette_6.webp" }
  ];

  for (const p of products) {
    const existing = await prisma.product.findFirst({ where: { name: p.name } });
    if (!existing) {
      await prisma.product.create({
        data: {
          name: p.name,
          price: p.price,
          stockQty: p.stockQty,
          category: p.category,
          imageUrl: p.imageUrl,
          isActive: true
        }
      });
    }
  }

  // 4. Create initial opening balance for demo customer only if not present
  const existingEntries = await prisma.ledgerEntry.count({ where: { customerId: customer.id } });
  if (existingEntries === 0) {
    await prisma.ledgerEntry.create({
      data: {
        customerId: customer.id,
        type: "DEBIT",
        amount: 1250.00,
        note: "Initial opening running account debt",
        createdBy: admin.id
      }
    });

    await prisma.ledgerEntry.create({
      data: {
        customerId: customer.id,
        type: "CREDIT",
        amount: 500.00,
        note: "Part-payment cash received in-store",
        createdBy: admin.id
      }
    });
  }

  console.log(`[Seed] Created opening balance for Customer (₹1250 debit - ₹500 credit = ₹750 net balance)`);
  console.log("[Seed] Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("[Seed] Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
