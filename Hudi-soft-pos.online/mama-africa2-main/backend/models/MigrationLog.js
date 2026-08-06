import mongoose from 'mongoose';

const migrationLogSchema = new mongoose.Schema({
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName: { type: String, default: 'Administrator' },
  source: { type: String, required: true }, // 'Excel (.xlsx)', 'CSV', 'SQLite Database', 'SQL Dump', 'Custom Backup'
  fileName: { type: String, default: 'Import_File' },
  recordsCount: {
    products: { type: Number, default: 0 },
    customers: { type: Number, default: 0 },
    suppliers: { type: Number, default: 0 },
    employees: { type: Number, default: 0 },
    categories: { type: Number, default: 0 },
    sales: { type: Number, default: 0 },
    purchases: { type: Number, default: 0 },
    expenses: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  duplicatesSkipped: { type: Number, default: 0 },
  errorsCount: { type: Number, default: 0 },
  warningsCount: { type: Number, default: 0 },
  durationSeconds: { type: Number, default: 0 },
  status: { type: String, enum: ['Completed', 'Failed', 'Rolled Back', 'In Progress'], default: 'Completed' },
  reportData: { type: mongoose.Schema.Types.Mixed, default: {} },
  backupId: { type: mongoose.Schema.Types.ObjectId, ref: 'MigrationBackup' }
}, { timestamps: true });

export default mongoose.model('MigrationLog', migrationLogSchema);
