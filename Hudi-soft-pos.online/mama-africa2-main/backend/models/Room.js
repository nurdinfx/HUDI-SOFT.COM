import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  number: { type: String, required: true },
  floor: { type: String, default: '1st Floor' },
  building: { type: String, default: 'Main Building' },
  roomType: { type: mongoose.Schema.Types.ObjectId, ref: 'RoomType', required: true },
  status: { 
    type: String, 
    enum: ['available', 'reserved', 'occupied', 'dirty', 'cleaning', 'clean', 'inspected', 'maintenance', 'out_of_order', 'blocked'], 
    default: 'available' 
  },
  created_at: { type: Date, default: Date.now }
});

export default mongoose.model('Room', roomSchema);
