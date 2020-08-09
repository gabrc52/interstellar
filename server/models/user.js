const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: String,
  schoolId: String,
  email: { type: String, unique: true },
  password: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  isVerified: {
    type: Boolean,
    default: false,
  },
  pageIds: {
    type: [String],
    default: [],
  },
  visible: {
    type: Boolean,
    default: true,
  },
  isSiteAdmin: {
    type: Boolean,
    default: false,
  },
  loungeId: {
    type: String, // blank indicates not in lounge
    default: "",
  },
});

// compile model from schema
module.exports = mongoose.model("user", UserSchema);
