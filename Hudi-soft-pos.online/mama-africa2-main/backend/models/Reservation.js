import mongoose from 'mongoose';

const folioChargeSchema = new mongoose.Schema({
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  type: { type: String, default: 'other' },
  sourceOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  date: { type: Date, default: Date.now }
});

const folioPaymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  method: { type: String, default: 'cash' },
  date: { type: Date, default: Date.now }
});

const reservationSchema = new mongoose.Schema({
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  guestName: { type: String, required: true },
  guestPhone: { type: String, required: true },
  guestEmail: { type: String, default: '' },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  roomType: { type: mongoose.Schema.Types.ObjectId, ref: 'RoomType', required: true },
  checkInDate: { type: Date, required: true },
  checkOutDate: { type: Date, required: true },
  status: { 
    type: String, 
    enum: ['reserved', 'checked_in', 'checked_out', 'cancelled'], 
    default: 'reserved' 
  },
  dailyRate: { type: Number, required: true },
  deposit: { type: Number, default: 0 },
  charges: [folioChargeSchema],
  payments: [folioPaymentSchema],
  created_at: { type: Date, default: Date.now }
});

export default mongoose.model('Reservation', reservationSchema);
