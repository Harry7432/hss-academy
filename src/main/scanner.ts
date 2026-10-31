import fs from 'fs';
import path from 'path';

export const VIDEO_EXTENSIONS = new Set([
  '.mp4',
  '.m4v',
  '.webm',
  '.mkv',
  '.mov',
  '.avi',
  '.ts'
]);

export interface ScannedLessonItem {
  moduleName: string;
  title: string;
  relativePath: string;
  sizeBytes: number;
}

export interface ScanCourseResult {
  title: string;
  lessons: ScannedLessonItem[];
}

/**
 * Ordenador natural para strings (ex: '01 - ...', '2 - ...', '10 - ...').
 */
export const naturalCompare = (a: string, b: string): number => {
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  return collator.compare(a, b);
};

/**
 * Remove a extensão do arquivo e retorna um título limpo.
 */
export const getCleanTitle = (fileName: string): string => {
  const ext = path.extname(fileName);
  return fileName.slice(0, -ext.length) || fileName;
};

/**
 * Verifica se uma extensão é um vídeo suportado.
 */
export const isVideoFile = (fileName: string): boolean => {
  if (fileName.startsWith('.') || fileName.startsWith('~$')) {
    return false;
  }
  const ext = path.extname(fileName).toLowerCase();
  return VIDEO_EXTENSIONS.has(ext);
};

/**
 * Varre o diretório do curso.
 * - Subpastas imediatas são tratadas como módulos.
 * - Vídeos soltos na raiz são agrupados em "Aulas gerais".
 * - Ordenação natural para pastas e arquivos.
 */
export function scanCourseDirectory(courseRootPath: string): ScanCourseResult {
  const resolvedRoot = path.resolve(courseRootPath);

  if (!fs.existsSync(resolvedRoot)) {
    throw new Error(`Pasta não encontrada: ${courseRootPath}`);
  }

  const stat = fs.statSync(resolvedRoot);
  if (!stat.isDirectory()) {
    throw new Error(`O caminho selecionado não é um diretório: ${courseRootPath}`);
  }

  const courseTitle = path.basename(resolvedRoot) || 'Curso Sem Nome';
  const rootEntries = fs.readdirSync(resolvedRoot, { withFileTypes: true });

  const rootFiles: string[] = [];
  const subDirs: string[] = [];

  for (const entry of rootEntries) {
    if (entry.name.startsWith('.') || entry.name.startsWith('$') || entry.name.toLowerCase() === 'system volume information') {
      continue;
    }
    if (entry.isDirectory()) {
      subDirs.push(entry.name);
    } else if (entry.isFile() && isVideoFile(entry.name)) {
      rootFiles.push(entry.name);
    }
  }

  // Ordenação natural
  rootFiles.sort(naturalCompare);
  subDirs.sort(naturalCompare);

  const lessons: ScannedLessonItem[] = [];

  // 1. Vídeos soltos na raiz -> Módulo "Aulas gerais"
  if (rootFiles.length > 0) {
    for (const fileName of rootFiles) {
      const fullPath = path.join(resolvedRoot, fileName);
      try {
        const fileStat = fs.statSync(fullPath);
        lessons.push({
          moduleName: 'Aulas gerais',
          title: getCleanTitle(fileName),
          relativePath: fileName,
          sizeBytes: fileStat.size
        });
      } catch (err) {
        console.warn(`Erro ao ler stat de ${fullPath}:`, err);
      }
    }
  }

  // 2. Subpastas como módulos
  for (const subDir of subDirs) {
    const subDirPath = path.join(resolvedRoot, subDir);
    try {
      const subEntries = fs.readdirSync(subDirPath, { withFileTypes: true });
      const videoFiles: string[] = [];

      for (const entry of subEntries) {
        if (!entry.name.startsWith('.') && entry.isFile() && isVideoFile(entry.name)) {
          videoFiles.push(entry.name);
        }
      }

      videoFiles.sort(naturalCompare);

      for (const fileName of videoFiles) {
        const fullPath = path.join(subDirPath, fileName);
        try {
          const fileStat = fs.statSync(fullPath);
          const relativePath = path.join(subDir, fileName).replace(/\\/g, '/');
          lessons.push({
            moduleName: subDir,
            title: getCleanTitle(fileName),
            relativePath,
            sizeBytes: fileStat.size
          });
        } catch (err) {
          console.warn(`Erro ao ler stat de ${fullPath}:`, err);
        }
      }
    } catch (err) {
      console.warn(`Erro ao ler subpasta ${subDirPath}:`, err);
    }
  }

  return {
    title: courseTitle,
    lessons
  };
}
