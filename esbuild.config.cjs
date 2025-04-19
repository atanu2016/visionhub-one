
const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

// Copy index.html to the dist directory
const copyIndexHtml = () => {
  console.log('Copying index.html to dist...');
  if (!fs.existsSync('./dist')) {
    fs.mkdirSync('./dist', { recursive: true });
  }
  
  fs.copyFileSync('./index.html', './dist/index.html');
  console.log('Index file copied successfully');
  
  // Also copy public directory
  if (fs.existsSync('./public')) {
    const files = fs.readdirSync('./public');
    for (const file of files) {
      fs.copyFileSync(`./public/${file}`, `./dist/${file}`);
    }
    console.log('Public files copied successfully');
  }
};

// Main build function
const build = async () => {
  try {
    console.log('Starting esbuild...');
    
    await esbuild.build({
      entryPoints: ['src/main.tsx'],
      bundle: true,
      minify: false, // Avoid minification for debugging
      sourcemap: true,
      format: 'esm',
      target: 'es2015',
      outfile: 'dist/assets/index.js',
      loader: {
        '.png': 'file',
        '.jpg': 'file',
        '.jpeg': 'file',
        '.svg': 'file',
        '.gif': 'file',
        '.woff': 'file',
        '.woff2': 'file',
        '.ttf': 'file',
        '.eot': 'file',
      },
      define: {
        'process.env.NODE_ENV': '"production"',
      },
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    });
    
    console.log('Build completed successfully!');
    copyIndexHtml();
    
    // Create CSS file (simplified approach)
    const cssContent = `
    @import 'tailwindcss/base';
    @import 'tailwindcss/components';
    @import 'tailwindcss/utilities';
    `;
    
    fs.writeFileSync('./dist/assets/index.css', cssContent);
    
    // Update index.html to reference the correct assets
    let indexHtml = fs.readFileSync('./dist/index.html', 'utf8');
    indexHtml = indexHtml.replace(
      '<head>',
      `<head>
    <link rel="stylesheet" href="/assets/index.css">
    <script type="module" src="/assets/index.js"></script>`
    );
    
    fs.writeFileSync('./dist/index.html', indexHtml);
    
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
};

// Run the build
build();
