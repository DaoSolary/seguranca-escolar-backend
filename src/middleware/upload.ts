import multer from 'multer';

// 🔥 USAR MEMORY STORAGE (ESSENCIAL)
export const upload = multer({
  storage: multer.memoryStorage(),
});