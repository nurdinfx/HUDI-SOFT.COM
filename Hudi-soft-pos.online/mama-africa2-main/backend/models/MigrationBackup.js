import mongoose from 'mongoose';

const migrationBackupSchema = new mongoose.Schema({
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  note: { type: String, default: 'Pre-migration automatic database snapshot' },
  snapshotData: {
    products: [{ type: mongoose.Schema.Types.Mixed }],
    customers: [{ type: mongoose.Schema.Types.Mixed }],
    suppliers: [{ type: mongoose.Schema.Types.Mixed }],
    categories: [{ type: mongoose.Schema.Types.Mixed }],
    employees: [{ type: mongoose.Schema.Types.Mixed }]
  },
  isRestored: { type: Boolean, default: false },
  restoredAt: { type: Date }
}, { timestamps: true });

export default mongoose.model('MigrationBackup', migrationBackupSchema);
