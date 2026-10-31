const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const pngToIco = require('png-to-ico').default || require('png-to-ico');

async function main() {
  const buildDir = path.resolve(__dirname, '../build');
  const sourceImage = path.join(buildDir, 'icon_source.jpg');

  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
  }

  const sizes = [16, 32, 48, 64, 128, 256];
  const pngFiles = [];

  for (const size of sizes) {
    const pngPath = path.join(buildDir, `icon_${size}.png`);
    await sharp(sourceImage)
      .resize(size, size, { fit: 'cover' })
      .png()
      .toFile(pngPath);
    pngFiles.push(pngPath);
  }

  // Gera o icon.png oficial de 256x256
  fs.copyFileSync(path.join(buildDir, 'icon_256.png'), path.join(buildDir, 'icon.png'));

  // Gera o icon.ico combinando os tamanhos padrão
  const icoBuffer = await pngToIco(pngFiles);
  const icoPath = path.join(buildDir, 'icon.ico');
  fs.writeFileSync(icoPath, icoBuffer);

  // Limpa arquivos intermediários
  for (const size of [16, 32, 48, 64, 128]) {
    try {
      fs.unlinkSync(path.join(buildDir, `icon_${size}.png`));
    } catch {}
  }

  console.log('Ícones criados com sucesso:');
  console.log('- ' + icoPath);
  console.log('- ' + path.join(buildDir, 'icon.png'));
}

main().catch((err) => {
  console.error('Erro ao gerar ícones:', err);
  process.exit(1);
});
