import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

// Inicializar Firebase Admin
let firebaseInitialized = false;

function initializeFirebase() {
  if (firebaseInitialized) return;

  try {
    // Opção 1: Usar variáveis de ambiente individuais
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        }),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      });
      firebaseInitialized = true;
      console.log('✅ Firebase Admin inicializado com sucesso');
      return;
    }

    // Opção 2: Usar arquivo JSON de service account
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: serviceAccount.project_id + '.appspot.com',
      });
      firebaseInitialized = true;
      console.log('✅ Firebase Admin inicializado com arquivo JSON');
      return;
    }

    console.warn('⚠️ Firebase não configurado. Uploads serão salvos localmente.');
  } catch (error) {
    console.error('❌ Erro ao inicializar Firebase:', error);
  }
}

// Inicializar na importação
initializeFirebase();

export interface UploadResult {
  url: string;
  nomeArquivo: string;
  tamanho: number;
  tipo: string;
}

/**
 * Upload de arquivo para Firebase Storage
 */
export async function uploadToFirebase(
  file: Express.Multer.File,
  folder: string = 'evidencias'
): Promise<UploadResult> {
  if (!firebaseInitialized) {
    // Fallback: salvar localmente
    return uploadLocal(file, folder);
  }

  try {
    const bucket = admin.storage().bucket();
    const fileName = `${folder}/${Date.now()}-${file.originalname}`;
    const fileUpload = bucket.file(fileName);

    // Upload do arquivo
    await fileUpload.save(file.buffer, {
      metadata: {
        contentType: file.mimetype,
        metadata: {
          originalName: file.originalname,
        },
      },
    });

    // Tornar o arquivo público (opcional)
    await fileUpload.makePublic();

    // Obter URL pública
    const url = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    return {
      url,
      nomeArquivo: fileName,
      tamanho: file.size,
      tipo: file.mimetype,
    };
  } catch (error) {
    console.error('Erro ao fazer upload para Firebase:', error);
    // Fallback para armazenamento local
    return uploadLocal(file, folder);
  }
}

/**
 * Upload local (fallback)
 */
async function uploadLocal(
  file: Express.Multer.File,
  folder: string = 'uploads'
): Promise<UploadResult> {
  const uploadDir = path.join(process.cwd(), 'uploads', folder);
  
  // Criar diretório se não existir
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const fileName = `${Date.now()}-${file.originalname}`;
  const filePath = path.join(uploadDir, fileName);
  console.log('📁 Salvando arquivo em:', filePath);
  // Salvar arquivo
  fs.writeFileSync(filePath, file.buffer);

  // Retornar URL relativa
  const url = `/uploads/${folder}/${fileName}`;

  return {
    url,
    nomeArquivo: fileName,
    tamanho: file.size,
    tipo: file.mimetype,
  };
}

/**
 * Deletar arquivo do Firebase Storage
 */
export async function deleteFromFirebase(fileUrl: string): Promise<void> {
  if (!firebaseInitialized) {
    // Deletar arquivo local
    const filePath = path.join(process.cwd(), fileUrl.replace(/^\//, ''));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return;
  }

  try {
    const bucket = admin.storage().bucket();
    const fileName = fileUrl.split('/').slice(-2).join('/'); // Extrair nome do arquivo da URL
    await bucket.file(fileName).delete();
  } catch (error) {
    console.error('Erro ao deletar arquivo do Firebase:', error);
  }
}

/**
 * Upload múltiplos arquivos
 */
export async function uploadMultipleFiles(
  files: Express.Multer.File[],
  folder: string = 'evidencias'
): Promise<UploadResult[]> {
  const uploads = files.map(file => uploadToFirebase(file, folder));
  return Promise.all(uploads);
}

