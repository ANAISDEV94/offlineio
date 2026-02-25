// Sample data for the UI scaffold (used before real DB integration)

export const sampleTrip = {
  id: "sample-trip-1",
  name: "Italy Girlies Trip 2026",
  destination: "Italy 🇮🇹",
  startDate: "2026-08-15",
  endDate: "2026-08-25",
  groupSize: 5,
  vibe: "luxury" as const,
  perPersonBudget: 3500,
  paymentDeadline: "2026-06-01",
  inviteCode: "ITALY2026",
};

export const sampleMembers = [
  { id: "1", displayName: "Jasmine", avatar: null, role: "organizer" as const, paid: 2800, owed: 3500 },
  { id: "2", displayName: "Aaliyah", avatar: null, role: "member" as const, paid: 1500, owed: 3500 },
  { id: "3", displayName: "Sofia", avatar: null, role: "member" as const, paid: 3500, owed: 3500 },
  { id: "4", displayName: "Priya", avatar: null, role: "member" as const, paid: 700, owed: 3500 },
  { id: "5", displayName: "Chloe", avatar: null, role: "member" as const, paid: 2100, owed: 3500 },
];

export const sampleItinerary = [
  { day: 1, items: [
    { time: "10:00 AM", activity: "Arrive in Rome ✈️", notes: "Meet at hotel lobby" },
    { time: "1:00 PM", activity: "Lunch at Trastevere 🍝", notes: "Reservation for 5" },
    { time: "5:00 PM", activity: "Colosseum tour 🏛️", notes: "Guided tour booked" },
  ]},
  { day: 2, items: [
    { time: "9:00 AM", activity: "Vatican Museums 🎨", notes: "Skip the line tickets" },
    { time: "2:00 PM", activity: "Shopping at Via Condotti 🛍️", notes: "Gucci & Prada" },
    { time: "8:00 PM", activity: "Rooftop dinner 🌙", notes: "Dress code: cute!" },
  ]},
  { day: 3, items: [
    { time: "8:00 AM", activity: "Train to Amalfi Coast 🚂", notes: "1st class tickets" },
    { time: "12:00 PM", activity: "Beach day in Positano 🏖️", notes: "Cabana reserved" },
    { time: "7:00 PM", activity: "Seafood dinner 🦐", notes: "Ask for the terrace" },
  ]},
];

export const sampleBudget = [
  { category: "Hotel", amount: 1200, spent: 1200, icon: "🏨" },
  { category: "Flights", amount: 800, spent: 800, icon: "✈️" },
  { category: "Activities", amount: 600, spent: 320, icon: "🎭" },
  { category: "Food", amount: 600, spent: 180, icon: "🍕" },
  { category: "Buffer", amount: 300, spent: 0, icon: "💰" },
];

export const sampleOutfits = [
  { id: "1", user: "Jasmine", occasion: "dinner", caption: "Roman dinner vibes 🌹", image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=500&fit=crop", reactions: ["🔥", "😍", "💅"] },
  { id: "2", user: "Aaliyah", occasion: "beach", caption: "Beach day ready ☀️", image: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400&h=500&fit=crop", reactions: ["😍", "✨", "🏖️"] },
  { id: "3", user: "Sofia", occasion: "night out", caption: "Night out fit 💃", image: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400&h=500&fit=crop", reactions: ["🔥", "🔥", "💕"] },
  { id: "4", user: "Priya", occasion: "airport", caption: "Airport chic ✈️", image: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400&h=500&fit=crop", reactions: ["👑", "✨", "💖"] },
];

export const samplePackingItems = [
  { id: "1", name: "Passport & travel docs 📄", checked: true, suggested: true },
  { id: "2", name: "Sunscreen SPF 50 ☀️", checked: true, suggested: true },
  { id: "3", name: "Cute sundresses (x3) 👗", checked: false, suggested: true },
  { id: "4", name: "Comfortable walking shoes 👟", checked: true, suggested: true },
  { id: "5", name: "Evening heels 👠", checked: false, suggested: true },
  { id: "6", name: "Swimsuit (x2) 👙", checked: false, suggested: true },
  { id: "7", name: "Chargers & adapters 🔌", checked: true, suggested: true },
  { id: "8", name: "Skincare routine ✨", checked: false, suggested: false },
  { id: "9", name: "Jewelry for dinner 💎", checked: false, suggested: false },
  { id: "10", name: "Camera / tripod 📸", checked: true, suggested: false },
];

export const sampleHypeMessages = [
  { date: "2026-02-15", message: "Hey queen, 180 days left until Italy! 🇮🇹 Time to start manifesting! ✨", type: "hype" as const },
  { date: "2026-03-01", message: "Soft reminder babe, you have $2,000 left by June 1 💅", type: "payment" as const },
  { date: "2026-04-15", message: "4 months to go! Have you started your Italian phrases? Ciao bella! 💋", type: "hype" as const },
  { date: "2026-05-01", message: "Payment check-in: $1,400 remaining. You got this! 💰", type: "payment" as const },
  { date: "2026-06-01", message: "⚠️ Payment deadline today! Make sure you're all caught up 💕", type: "payment" as const },
  { date: "2026-07-15", message: "One month out! Time to start packing, girlie! 🧳", type: "hype" as const },
  { date: "2026-08-01", message: "2 weeks! Start checking off that packing list 📝", type: "hype" as const },
  { date: "2026-08-08", message: "One week to go! The group chat is about to be LIT 🔥", type: "hype" as const },
  { date: "2026-08-12", message: "3 DAYS! Outfits packed? Nails done? LET'S GOOO 💅✈️", type: "hype" as const },
];

export const sampleBookings = [
  { category: "flight" as const, title: "NYC → Rome (FCO)", url: "https://google.com/flights", notes: "Delta, direct flight, Aug 14", price: 780 },
  { category: "flight" as const, title: "Naples → NYC", url: "https://google.com/flights", notes: "ITA Airways, Aug 25", price: 720 },
  { category: "hotel" as const, title: "Hotel de Russie, Rome", url: "https://booking.com", notes: "3 nights, 2 rooms", price: 1800 },
  { category: "hotel" as const, title: "Le Sirenuse, Positano", url: "https://booking.com", notes: "4 nights, sea view", price: 2400 },
  { category: "activity" as const, title: "Vatican Skip-the-Line Tour", url: "https://getyourguide.com", notes: "Includes Sistine Chapel", price: 65 },
  { category: "activity" as const, title: "Amalfi Coast Boat Tour", url: "https://viator.com", notes: "Full day, lunch included", price: 120 },
];

export const vibeOptions = [
  { value: "luxury", label: "Luxury 💎", color: "gold" },
  { value: "soft-life", label: "Soft Life 🧘‍♀️", color: "lavender" },
  { value: "party", label: "Party 🎉", color: "blush" },
  { value: "wellness", label: "Wellness 🌿", color: "mint" },
  { value: "cultural", label: "Cultural 🎭", color: "peach" },
];
