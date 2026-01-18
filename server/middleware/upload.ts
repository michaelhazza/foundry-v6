import multer from 'multer';
import { BadRequestError } from '../errors';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const ALLOWED_MIME_TYPES = [
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/json',
];

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const extension = file.originalname.split('.').pop()?.toLowerCase();

    if (
      ALLOWED_MIME_TYPES.includes(file.mimetype) ||
      ['csv', 'xlsx', 'xls', 'json'].includes(extension || '')
    ) {
      cb(null, true);
    } else {
      cb(new BadRequestError('Unsupported file type. Please upload a CSV, Excel (.xlsx), or JSON file.') as Error);
    }
  },
});
