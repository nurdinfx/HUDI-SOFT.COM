import mongoose from 'mongoose';

const roomTypeSchema = new mongoose.Schema({
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  baseRate: { type: Number, required: true, default: 0 },
  amenities: [{ type: String }],
  maxOccupancy: { type: Number, default: 2 },
  created_at: { type: Date, default: Date.now }
});

export default mongoose.model('RoomType', roomTypeSchema);
