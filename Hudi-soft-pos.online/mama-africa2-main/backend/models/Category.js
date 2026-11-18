import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true }
}, { timestamps: true });

// Compound index to ensure unique category name per branch
categorySchema.index({ name: 1, branch: 1 }, { unique: true });

export default mongoose.model('Category', categorySchema);
