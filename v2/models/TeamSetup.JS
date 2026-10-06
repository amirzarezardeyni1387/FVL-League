const mongoose = require('mongoose');

const TeamSetupSchema = new mongoose.Schema({
  matchId: { type: String, required: true },
  teamId: { type: String, required: true },
  lineupImage: { type: String, required: true }, // آدرس تصویر ترکیب
  startingPlayers: [{ type: String }],
  substitutes: [{ type: String }],
  tactics: {
    formation: { type: String }, // مانند 4-3-3
    mentality: { type: String }, // مانند Attacking
    instructions: { type: String } // دستورات متنی مخفی
  }
}, { timestamps: true });

module.exports = mongoose.model('TeamSetup', TeamSetupSchema);