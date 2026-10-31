import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Configuração do Instalador NSIS Profissional', () => {
  const packageJsonPath = path.resolve(__dirname, '../package.json');
  const iconPath = path.resolve(__dirname, '../build/icon.ico');

  it('deve possuir um arquivo de ícone .ico próprio e válido na pasta build', () => {
    expect(fs.existsSync(iconPath)).toBe(true);
    const stat = fs.statSync(iconPath);
    expect(stat.size).toBeGreaterThan(10000); // Ícone multi-resolução válido
  });

  it('deve configurar a editora como HSS Tech Solutions e atalhos automáticos', () => {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

    expect(pkg.author).toBe('HSS Tech Solutions');
    expect(pkg.build.productName).toBe('HSS Academy');
    expect(pkg.build.win.legalTrademarks).toBe('HSS Tech Solutions');

    const nsis = pkg.build.nsis;
    expect(nsis.createDesktopShortcut).toBe('always');
    expect(nsis.createStartMenuShortcut).toBe(true);
    expect(nsis.shortcutName).toBe('HSS Academy');
    expect(nsis.deleteAppDataOnUninstall).toBe(false);
    expect(nsis.installerIcon).toBe('build/icon.ico');
    expect(nsis.uninstallerIcon).toBe('build/icon.ico');
  });
});
