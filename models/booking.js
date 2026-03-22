import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({

  bookingId: {
    type: String,
    unique: true
  },

  name: {
    type: String,
    required: true,
    trim: true
  },

  email: {
    type: String,
    required: true,
    lowercase: true,
    match: /^\S+@\S+\.\S+$/
  },

  phone: {
    type: String,
    required: true,
    match: /^[0-9]{10}$/
  },

  city: {
    type: String,
    required: true,
    enum: ["Delhi", "Mumbai", "Bangalore", "Goa"]
  },

  vehicle: {
    type: String,
    enum: ["car", "suv", "bus", null], // ✅ fixed null issue
    default: null
  },

  guide: {
    type: String,
    enum: ["none", "basic", "premium"],
    default: "none"
  },

  accommodation: {
    type: String,
    enum: ["budget", "standard", "luxury", null], // ✅ fixed null issue
    default: null
  },

  date: {
    type: Date,
    required: true
  },

  travelers: {
    type: Number,
    required: true,
    min: 1,
    max: 20
  },

  duration: {
    type: Number,
    required: true,
    min: 1,
    max: 30
  },

  specialRequests: {
    type: String,
    default: ""
  },

  estimatedCost: {
    type: Number,
    required: true
  },

  status: {
    type: String,
    enum: ["pending", "confirmed", "cancelled"],
    default: "pending"
  },

  bookingDate: {
    type: Date,
    default: Date.now
  }

}, { timestamps: true });

/* 🔥 Auto Booking ID (fixed + improved) */
bookingSchema.pre("save", function () {
  if (!this.bookingId) {
    this.bookingId =
      "IND" + Date.now() + Math.floor(Math.random() * 1000);
  }
});
  

/* ✅ EXPORT MODEL */
const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;