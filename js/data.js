// Store contact — change these to your real numbers (digits only, with country code).
const CONTACT = {
  phone: "919876543210",          // used for click-to-call
  whatsapp: "919876543210",       // used for wa.me link
  display: "+91 98765 43210",     // shown on the site
  waMessage: "Hi Vitalyx! I need help choosing a supplement."
};
const telLink = `tel:+${CONTACT.phone}`;
const waLink = (msg = CONTACT.waMessage) => `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(msg)}`;

// Catalogue data — all brands and products are fictional.
const CATEGORIES = [
  { id: "protein", name: "Whey Protein", icon: "💪", color: "#0b6e4f" },
  { id: "gainer", name: "Mass Gainers", icon: "🏋️", color: "#7a3e9d" },
  { id: "preworkout", name: "Pre-Workout", icon: "⚡", color: "#e4572e" },
  { id: "vitamins", name: "Multivitamins", icon: "💊", color: "#f2a541" },
  { id: "omega", name: "Fish Oil & Omega", icon: "🐟", color: "#1d70a2" },
  { id: "ayurveda", name: "Ayurveda & Herbs", icon: "🌿", color: "#4c956c" },
  { id: "weight", name: "Weight Management", icon: "⚖️", color: "#d1495b" },
  { id: "sports", name: "Sports Nutrition", icon: "🥤", color: "#2b2d42" }
];

const GOALS = [
  { id: "muscle", name: "Build Muscle", desc: "High-protein stacks", icon: "💪" },
  { id: "fatloss", name: "Lose Fat", desc: "Burners & L-carnitine", icon: "🔥" },
  { id: "immunity", name: "Boost Immunity", desc: "Vitamin C, D3 & zinc", icon: "🛡️" },
  { id: "energy", name: "Energy & Stamina", desc: "Pre-workouts & electrolytes", icon: "⚡" },
  { id: "wellness", name: "Daily Wellness", desc: "Multis, omega & herbs", icon: "🌱" },
  { id: "recovery", name: "Faster Recovery", desc: "BCAA, glutamine & creatine", icon: "🔄" }
];

const BRANDS = [
  { name: "Vitalyx Pro", tag: "In-house" },
  { name: "MuscleArc", tag: "Performance" },
  { name: "GreenLeaf Labs", tag: "Plant-based" },
  { name: "IronPeak", tag: "Strength" },
  { name: "OmegaWell", tag: "Wellness" },
  { name: "AyurNova", tag: "Ayurveda" },
  { name: "LeanLine", tag: "Weight" },
  { name: "HydraFuel", tag: "Hydration" }
];

const PRODUCTS = [
  {
    id: 1, name: "100% Whey Protein Isolate", brand: "Vitalyx Pro", category: "protein", goals: ["muscle", "recovery"],
    price: 4299, mrp: 5999, rating: 4.6, reviews: 12840, color: "#0b6e4f", accent: "#9be3c4", badge: "Bestseller",
    sizes: ["1 kg", "2 kg", "4 kg"], flavours: ["Double Rich Chocolate", "Café Mocha", "Kesar Pista Badam", "Unflavoured"],
    protein: "27g", servings: 30,
    desc: "Cold-processed whey isolate with 27g protein per scoop, low lactose and zero added sugar. Every batch is lab-tested for protein content and heavy metals.",
    highlights: ["27g protein, 6g BCAA per serving", "Cold-filtered isolate, < 1g sugar", "Third-party lab tested every batch", "Digestive enzymes for easy absorption"]
  },
  {
    id: 2, name: "Raw Whey Concentrate 80%", brand: "IronPeak", category: "protein", goals: ["muscle"],
    price: 2799, mrp: 3899, rating: 4.4, reviews: 8421, color: "#2b2d42", accent: "#edf2f4", badge: "Value Pick",
    sizes: ["1 kg", "2 kg"], flavours: ["Unflavoured", "Chocolate"],
    protein: "24g", servings: 33,
    desc: "Unflavoured, unsweetened whey concentrate for people who want only protein. Mixes into smoothies, oats and baking.",
    highlights: ["24g protein per 30g scoop", "No added flavours or sweeteners", "Grass-fed source", "Batch-wise lab reports"]
  },
  {
    id: 3, name: "Hydrolysed Whey Elite", brand: "MuscleArc", category: "protein", goals: ["muscle", "recovery"],
    price: 5899, mrp: 7499, rating: 4.7, reviews: 3120, color: "#e4572e", accent: "#ffd6c9", badge: "Premium",
    sizes: ["1 kg", "2 kg"], flavours: ["Belgian Chocolate", "Cookies & Cream", "Mango"],
    protein: "28g", servings: 30,
    desc: "Pre-digested hydrolysed whey that absorbs quickly after a workout. Made for athletes with heavy training loads.",
    highlights: ["Fast-absorbing hydrolysed peptides", "28g protein per scoop", "Informed-sport style screening", "Added glutamine"]
  },
  {
    id: 4, name: "Plant Protein Blend", brand: "GreenLeaf Labs", category: "protein", goals: ["muscle", "wellness"],
    price: 2499, mrp: 3299, rating: 4.3, reviews: 2210, color: "#4c956c", accent: "#d8f3dc", badge: "Vegan",
    sizes: ["500 g", "1 kg"], flavours: ["Chocolate", "Vanilla"],
    protein: "25g", servings: 20,
    desc: "Pea and brown-rice protein blend with a complete amino-acid profile. 100% vegan, soy-free and gluten-free.",
    highlights: ["Pea + brown rice blend", "Complete amino profile", "No soy, no gluten", "Certified vegan"]
  },
  {
    id: 5, name: "Super Mass Gainer XXL", brand: "IronPeak", category: "gainer", goals: ["muscle"],
    price: 2999, mrp: 4199, rating: 4.2, reviews: 6532, color: "#7a3e9d", accent: "#e9d5f5", badge: "Bestseller",
    sizes: ["3 kg", "5 kg"], flavours: ["Chocolate", "Banana", "Vanilla"],
    protein: "30g", servings: 20,
    desc: "High-calorie gainer with complex carbs and 30g protein per serving, made for hard gainers.",
    highlights: ["1250 kcal per serving", "Complex carbs from oats", "30g protein", "Added creatine & enzymes"]
  },
  {
    id: 6, name: "Lean Gainer 1:2", brand: "Vitalyx Pro", category: "gainer", goals: ["muscle"],
    price: 2199, mrp: 2899, rating: 4.3, reviews: 1987, color: "#5a189a", accent: "#e0aaff", badge: "",
    sizes: ["1 kg", "3 kg"], flavours: ["Chocolate", "Malai Kulfi"],
    protein: "27g", servings: 10,
    desc: "Protein-to-carb ratio of 1:2 for clean bulking without excess fat gain.",
    highlights: ["1:2 protein-carb ratio", "No added sugar", "Clean bulking formula", "Lab-tested"]
  },
  {
    id: 7, name: "Nitro Blast Pre-Workout", brand: "MuscleArc", category: "preworkout", goals: ["energy"],
    price: 1899, mrp: 2599, rating: 4.5, reviews: 4410, color: "#d00000", accent: "#ffccd5", badge: "Trending",
    sizes: ["30 servings", "60 servings"], flavours: ["Fruit Punch", "Blue Raspberry", "Green Apple"],
    protein: "—", servings: 30,
    desc: "Clinically dosed pre-workout with citrulline, beta-alanine and 200mg caffeine for focus and pumps.",
    highlights: ["6g L-citrulline", "3.2g beta-alanine", "200mg natural caffeine", "No proprietary blend"]
  },
  {
    id: 8, name: "Creatine Monohydrate", brand: "Vitalyx Pro", category: "sports", goals: ["muscle", "recovery", "energy"],
    price: 799, mrp: 1199, rating: 4.7, reviews: 15320, color: "#14213d", accent: "#fca311", badge: "Bestseller",
    sizes: ["100 g", "250 g"], flavours: ["Unflavoured"],
    protein: "—", servings: 83,
    desc: "Micronised creatine monohydrate, 3g per serving. The most researched supplement for strength.",
    highlights: ["Micronised for solubility", "3g per serving", "Single-ingredient", "Lab tested for purity"]
  },
  {
    id: 9, name: "BCAA 2:1:1 + Electrolytes", brand: "HydraFuel", category: "sports", goals: ["recovery", "energy"],
    price: 1299, mrp: 1799, rating: 4.4, reviews: 3870, color: "#0077b6", accent: "#caf0f8", badge: "",
    sizes: ["250 g", "450 g"], flavours: ["Watermelon", "Lemon Lime", "Tangy Orange"],
    protein: "—", servings: 30,
    desc: "Intra-workout BCAA in a 2:1:1 ratio with added electrolytes to support hydration and recovery.",
    highlights: ["7g BCAA per serving", "Sodium, potassium & magnesium", "Zero sugar", "Great taste"]
  },
  {
    id: 10, name: "Daily Multivitamin Men", brand: "OmegaWell", category: "vitamins", goals: ["wellness", "immunity", "energy"],
    price: 549, mrp: 899, rating: 4.5, reviews: 9820, color: "#f2a541", accent: "#fff3d6", badge: "Bestseller",
    sizes: ["60 tabs", "120 tabs"], flavours: ["—"],
    protein: "—", servings: 60,
    desc: "A complete daily multivitamin with 40+ nutrients, including ginseng and probiotics for active men.",
    highlights: ["40+ vitamins & minerals", "Ginseng & ashwagandha", "Probiotics for gut health", "Once daily"]
  },
  {
    id: 11, name: "Women's Multivitamin", brand: "OmegaWell", category: "vitamins", goals: ["wellness", "immunity"],
    price: 549, mrp: 899, rating: 4.5, reviews: 6210, color: "#d63384", accent: "#ffd6e8", badge: "",
    sizes: ["60 tabs"], flavours: ["—"],
    protein: "—", servings: 60,
    desc: "Made for women with iron, folic acid, biotin and collagen boosters for energy, skin and hair.",
    highlights: ["Iron + folic acid", "Biotin for hair & nails", "Calcium & D3 for bones", "Once daily"]
  },
  {
    id: 12, name: "Vitamin D3 + K2", brand: "GreenLeaf Labs", category: "vitamins", goals: ["immunity", "wellness"],
    price: 449, mrp: 699, rating: 4.6, reviews: 4120, color: "#ffb703", accent: "#fff1c1", badge: "",
    sizes: ["60 caps"], flavours: ["—"],
    protein: "—", servings: 60,
    desc: "2000 IU vitamin D3 with K2-7 to support bone density, immunity and calcium metabolism.",
    highlights: ["2000 IU D3", "K2 as MK-7", "Vegetarian capsule", "Bone & immunity support"]
  },
  {
    id: 13, name: "Triple Strength Fish Oil", brand: "OmegaWell", category: "omega", goals: ["wellness", "recovery"],
    price: 899, mrp: 1399, rating: 4.6, reviews: 7650, color: "#1d70a2", accent: "#cde7f7", badge: "Top Rated",
    sizes: ["60 softgels", "90 softgels"], flavours: ["—"],
    protein: "—", servings: 60,
    desc: "1250mg fish oil with 900mg EPA+DHA per softgel, molecularly distilled for purity. No fishy burps.",
    highlights: ["900mg EPA + DHA", "Molecularly distilled", "Enteric coated", "Heart, brain & joint health"]
  },
  {
    id: 14, name: "Ashwagandha KSM-Grade", brand: "AyurNova", category: "ayurveda", goals: ["wellness", "energy"],
    price: 499, mrp: 799, rating: 4.5, reviews: 5340, color: "#6a994e", accent: "#e9f5db", badge: "Ayurvedic",
    sizes: ["60 caps", "90 caps"], flavours: ["—"],
    protein: "—", servings: 60,
    desc: "Standardised root extract with 5% withanolides to support stress relief, sleep and stamina.",
    highlights: ["600mg root extract", "5% withanolides", "AYUSH compliant", "Stress & sleep support"]
  },
  {
    id: 15, name: "Shilajit Resin Gold", brand: "AyurNova", category: "ayurveda", goals: ["energy", "wellness"],
    price: 1199, mrp: 1799, rating: 4.3, reviews: 2890, color: "#3c2a21", accent: "#d5b895", badge: "",
    sizes: ["20 g"], flavours: ["—"],
    protein: "—", servings: 60,
    desc: "Purified Himalayan shilajit resin with fulvic acid for vitality and endurance.",
    highlights: ["Himalayan origin", "60%+ fulvic acid", "Tested for heavy metals", "With measuring spoon"]
  },
  {
    id: 16, name: "Apple Cider Vinegar w/ Mother", brand: "LeanLine", category: "weight", goals: ["fatloss", "wellness"],
    price: 399, mrp: 599, rating: 4.2, reviews: 8710, color: "#bc4749", accent: "#fde2e4", badge: "",
    sizes: ["500 ml", "1 L"], flavours: ["Original", "Honey"],
    protein: "—", servings: 33,
    desc: "Raw, unfiltered apple cider vinegar with mother to support digestion and metabolism.",
    highlights: ["Raw & unfiltered", "With the mother", "No added preservatives", "Supports digestion"]
  },
  {
    id: 17, name: "L-Carnitine 3000", brand: "LeanLine", category: "weight", goals: ["fatloss", "energy"],
    price: 1099, mrp: 1599, rating: 4.3, reviews: 3120, color: "#d1495b", accent: "#ffdde1", badge: "",
    sizes: ["450 ml"], flavours: ["Green Apple", "Lemon"],
    protein: "—", servings: 30,
    desc: "Liquid L-carnitine L-tartrate to help convert fat into energy during cardio.",
    highlights: ["3000mg per serving", "Fast-acting liquid", "Zero sugar", "Pre-cardio formula"]
  },
  {
    id: 18, name: "Instant Electrolyte Mix", brand: "HydraFuel", category: "sports", goals: ["energy", "recovery"],
    price: 349, mrp: 499, rating: 4.4, reviews: 2560, color: "#00b4d8", accent: "#d7f6fc", badge: "New",
    sizes: ["20 sachets"], flavours: ["Lemon", "Orange", "Mixed Berry"],
    protein: "—", servings: 20,
    desc: "Sugar-free electrolyte drink mix with sodium, potassium and magnesium for long workouts and hot days.",
    highlights: ["5 key electrolytes", "Zero sugar", "Travel-friendly sachets", "Vitamin C added"]
  },
  {
    id: 19, name: "Vitamin C + Zinc Effervescent", brand: "GreenLeaf Labs", category: "vitamins", goals: ["immunity"],
    price: 299, mrp: 450, rating: 4.4, reviews: 6120, color: "#f77f00", accent: "#ffe5cc", badge: "",
    sizes: ["15 tabs", "30 tabs"], flavours: ["Orange", "Lemon"],
    protein: "—", servings: 15,
    desc: "1000mg vitamin C with zinc in a fizzy tablet for daily immune support.",
    highlights: ["1000mg vitamin C", "10mg zinc", "Sugar-free", "Refreshing taste"]
  },
  {
    id: 20, name: "Peanut Butter High Protein", brand: "Vitalyx Pro", category: "sports", goals: ["muscle", "wellness"],
    price: 499, mrp: 699, rating: 4.5, reviews: 10450, color: "#8b5e34", accent: "#f3d5b5", badge: "Bestseller",
    sizes: ["1 kg"], flavours: ["Crunchy", "Creamy", "Dark Chocolate"],
    protein: "30g", servings: 31,
    desc: "Roasted peanuts with added whey for 30g protein per 100g. No palm oil, no hydrogenated fats.",
    highlights: ["30g protein / 100g", "No palm oil", "No hydrogenated fats", "Unsweetened option"]
  }
];

const TESTIMONIALS = [
  { name: "Rohit S.", city: "Pune", text: "I scanned the batch code on my whey and the lab report came up straight away. I finally trust what I'm drinking.", rating: 5 },
  { name: "Ananya M.", city: "Bengaluru", text: "Fast delivery and the products are sealed with holograms. The goal-based picks made choosing simple.", rating: 5 },
  { name: "Imran K.", city: "Hyderabad", text: "The prices beat local stores and I get loyalty cashback on every order. Their creatine is great value.", rating: 4 },
  { name: "Priya D.", city: "Delhi", text: "The free dietitian consult helped me pick a plant protein that suits my digestion. Very helpful.", rating: 5 }
];

const ARTICLES = [
  { title: "Whey Isolate vs Concentrate: Which Should You Buy?", tag: "Protein", read: "6 min", color: "#0b6e4f" },
  { title: "5 Ways to Spot a Fake Supplement Before You Buy", tag: "Authenticity", read: "4 min", color: "#e4572e" },
  { title: "Creatine Myths, Busted by Science", tag: "Performance", read: "7 min", color: "#14213d" },
  { title: "Building an Immunity Stack for the Monsoon", tag: "Wellness", read: "5 min", color: "#f2a541" }
];
