import mongoose from "mongoose";
import { z } from "zod";

import { Product } from "../models/Product";
import { productInputSchema } from "../lib/validation/product";

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME ?? "quicklaunch";

if (!MONGODB_URI) {
  throw new Error(
    "MONGODB_URI is required. Run with `tsx --env-file-if-exists=.env.local scripts/seed.ts`"
  );
}

const mongoUri: string = MONGODB_URI;

type SeedProduct = z.input<typeof productInputSchema>;

const products: SeedProduct[] = [
  {
    type: "COURSE",
    slug: "ai-product-craft-from-idea-to-roadmap",
    title: "AI Product Craft: From Idea to Roadmap",
    shortDescription:
      "A crash course on using AI inside product work — from problem framing to a buildable roadmap.",
    description:
      "Most product teams treat AI as a feature to bolt on. This course treats it as a working practice.\n\nYou will move from a raw idea to a prioritized roadmap by applying structured product thinking with AI support at every step: framing the problem, mapping users, pressure-testing assumptions, and turning the result into a plan you can execute.",
    status: "PUBLISHED",
    priceMinor: 5_000_000,
    currency: "NGN",
    fulfillmentMode: "CLASSROOM",
    featured: true,
    sortOrder: 1,
    seoTitle: "AI Product Craft: From Idea to Roadmap | Rapid Launch",
    seoDescription:
      "A self-paced AI product course: problem framing, user mapping, and a buildable roadmap, delivered in Google Classroom.",
    courseDetails: {
      instructor: "Rapid Launch",
      durationMinutes: 180,
      level: "INTERMEDIATE",
      audience: ["Product managers", "Founders", "Product designers"],
      outcomes: [
        "Frame a product problem before writing a single requirement",
        "Build a customer map that survives contact with evidence",
        "Use AI to draft and pressure-test a product roadmap",
        "Turn the roadmap into a scope the next build can start from",
      ],
      syllabus: [
        "Framing the problem and the users",
        "Assumptions, risks, and evidence mapping",
        "AI-assisted ideation and prioritization",
        "From roadmap to buildable scope",
        "Shipping the first working slice",
      ],
      classroomCourseId: "1234567890",
      enrollmentMode: "AUTOMATIC",
      accessInstructions:
        "Enroll the Google account you want to use in Google Classroom.",
    },
  },
  {
    type: "COURSE",
    slug: "feedback-loops-that-ship",
    title: "Feedback Loops That Ship",
    shortDescription:
      "Draft course in production: turning customer feedback into shipped iterations.",
    status: "DRAFT",
    priceMinor: 3_000_000,
    currency: "NGN",
  },
  {
    type: "BOOK",
    slug: "ship-less-learn-more",
    title: "Ship Less, Learn More",
    shortDescription:
      "A short, practical guide to cutting scope until the only thing left is learning.",
    description:
      "Scope is a strategy, not a schedule. This book walks through how to reduce a product to the smallest amount of work that still produces a real answer.\n\nEach chapter ends with a checklist you can apply to a live product the same week.",
    status: "PUBLISHED",
    priceMinor: 1_500_000,
    currency: "NGN",
    fulfillmentMode: "DOWNLOAD",
    featured: false,
    sortOrder: 1,
    bookDetails: {
      author: "Rapid Launch",
      isbn: "978-0-0000000-0-0",
      format: "PDF + EPUB",
      deliveryMode: "DIGITAL_DOWNLOAD",
      assetKey: "ship-less-learn-more",
      inventoryMode: "UNLIMITED",
    },
  },
  {
    type: "BOOK",
    slug: "the-product-market-fit-field-manual",
    title: "The Product-Market Fit Field Manual",
    shortDescription:
      "Print edition, purchased on an external store. Checkout happens on the store.",
    description:
      "A field manual for founders and product managers who want to organize evidence around product-market fit.\n\nThis title is sold through an external store; your purchase and delivery are handled there.",
    status: "PUBLISHED",
    priceMinor: 0,
    currency: "NGN",
    fulfillmentMode: "EXTERNAL",
    featured: false,
    sortOrder: 2,
    bookDetails: {
      author: "Rapid Launch",
      format: "Print",
      deliveryMode: "EXTERNAL",
      externalUrl: "https://store.example.com/products/product-market-fit-field-manual",
      inventoryMode: "UNLIMITED",
    },
  },
  {
    type: "BOOK",
    slug: "ai-workflows-for-product-managers",
    title: "AI Workflows for Product Managers",
    shortDescription: "Draft book: the daily AI workflows that save product hours.",
    status: "DRAFT",
    priceMinor: 2_000_000,
    currency: "NGN",
  },
  {
    type: "CONSULTATION",
    slug: "90-minute-one-on-one-strategy-session",
    title: "90-Minute One-on-One Strategy Session",
    shortDescription:
      "A one-on-one to close the gap between your idea and execution.",
    description:
      "Whether you already have a strategy or are still shaping your idea, this session helps you move from idea to execution.\n\nIn ninety minutes we walk through your roadmap, the team you need and how to set it up, and what you should be building right now. We explain, in detail, how to build your product with AI — every step of the way — so you leave knowing exactly how to build it and what to watch for at each point.\n\nYou leave with real clarity: on what to build and how to build it. If you would like us to build the solution for you, we can do that too, as a paid service.",
    status: "PUBLISHED",
    priceMinor: 10_000_000,
    currency: "NGN",
    fulfillmentMode: "SCHEDULER",
    featured: false,
    sortOrder: 1,
    consultationDetails: {
      sessionTypes: [
        "Strategy & roadmap clarity",
        "Team setup",
        "What to build now",
        "How to build it with AI",
      ],
      durationMinutes: 90,
      bookingMode: "EXTERNAL_SCHEDULER",
      schedulerUrl: "https://cal.example.com/quicklaunch/strategy",
      preparationInstructions:
        "Tell us where you are: whether you already have a strategy you want to build, or an idea you are still shaping. A short paragraph is enough before the session.",
      reschedulePolicy: "Free rescheduling up to 24 hours before the session.",
      cancellationPolicy: "Sessions cancelled with less than 24 hours notice are not refunded.",
    },
  },
  {
    type: "MVP_SERVICE",
    slug: "idea-to-mvp-sprint",
    title: "Idea to MVP Sprint",
    shortDescription:
      "An outcome-oriented engagement from idea to a buildable, launchable MVP.",
    description:
      "A focused engagement where product strategy, technical planning, and implementation come together.\n\nYou get a scope you can understand, a build that ships in waves, and the source code handed over. The full price depends on scope and is quoted after discovery.",
    status: "PUBLISHED",
    priceMinor: 0,
    currency: "NGN",
    fulfillmentMode: "MANUAL",
    featured: true,
    sortOrder: 1,
    mvpServiceDetails: {
      quoteMode: true,
      startingPriceMinor: 150_000_000,
      scope:
        "Product strategy, technical planning, iterative MVP builds, and source-code handover.",
      deliverables: [
        "A buildable plan and acceptance criteria",
        "An MVP built in shipping waves",
        "Source code and setup documentation",
      ],
    },
  },
  {
    type: "CONSULTATION",
    slug: "ai-tooling-audit",
    title: "AI Tooling Audit",
    shortDescription: "Draft offer: an audit of your team's AI tooling spend and workflow.",
    status: "DRAFT",
    priceMinor: 8_000_000,
    currency: "NGN",
  },
];

for (const product of products) {
  productInputSchema.parse(product);
}

async function seed() {
  await mongoose.connect(mongoUri, { dbName: DB_NAME });
  console.log(`Connected to MongoDB (${DB_NAME})`);

  for (const product of products) {
    await Product.updateOne(
      { slug: product.slug },
      {
        $set: {
          ...product,
          publishedAt:
            product.status === "PUBLISHED" ? new Date() : null,
        },
      },
      { upsert: true }
    );
    console.log(`Upserted ${product.type} / ${product.slug} (${product.status})`);
  }

  await mongoose.disconnect();
  console.log("Seed complete.");
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});