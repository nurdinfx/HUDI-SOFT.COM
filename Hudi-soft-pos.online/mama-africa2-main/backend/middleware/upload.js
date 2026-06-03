import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define storage paths
const homeDir = process.env.HOME || process.env.USERPROFILE;
const baseStart = process.env.PERSISTENT_STORAGE_PATH || homeDir;
const storageBaseDir = process.env.PERSISTENT_STORAGE_PATH ? baseStart : path.join(baseStart, 'mama-africa-storage');
const uploadsDir = path.join(storageBaseDir, 'uploads');
const productImagesDir = path.join(uploadsDir, 'products');

// Ensure directories exist
try {
  if (!fs.existsSync(storageBaseDir)) fs.mkdirSync(storageBaseDir, { recursive: true });
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  if (!fs.existsSync(productImagesDir)) fs.mkdirSync(productImagesDir, { recursive: true });
} catch (err) {
  console.error('Upload directory creation error:', err);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

export const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});
