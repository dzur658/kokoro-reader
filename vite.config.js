import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'
import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'fs'
import { join } from 'path'

// WASM and MJS files required for ONNX Runtime
const ONNX_FILES = [
  'node_modules/@huggingface/transformers/dist/ort-wasm-simd-threaded.jsep.wasm',
  'node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm',
  'node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.jsep.mjs',
  'node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.mjs'
];

function injectManualChunks() {
  return {
    name: 'inject-manual-chunks',
    writeBundle(options, bundle) {
      const outputDir = options.dir || 'dist';
      
      // Copy ONNX files from node_modules to dist
      ONNX_FILES.forEach(src => {
        const dest = join(outputDir, src.split('/').pop());
        try {
          copyFileSync(src, dest);
          console.log(`✓ Copied ${src.split('/').pop()}`);
        } catch (err) {
          console.error(`❌ Failed to copy required ONNX file ${src}:`, err.message);
          throw new Error(`Build failed: Required ONNX file could not be copied from ${src}`);
        }
      });
      
      // Read the manifest that CRXJS wrote to disk
      const manifestPath = join(outputDir, 'manifest.json');
      
      if (!existsSync(manifestPath)) {
        console.warn('Manifest not found at:', manifestPath);
        return;
      }
      
      try {
        // Parse the manifest
        const manifestContent = readFileSync(manifestPath, 'utf-8');
        const manifestData = JSON.parse(manifestContent);
        
        // Find the <all_urls> entry
        let allUrlsEntry = manifestData.web_accessible_resources?.find(
          entry => entry.matches && entry.matches.includes('<all_urls>')
        );
        
        if (!allUrlsEntry) {
          console.warn('No <all_urls> entry found in web_accessible_resources');
          return;
        }
        
        // Chunks to inject (without assets/ prefix since CRXJS outputs to root)
        const chunksToInject = [
          'tts-vendor.js',
          'react-vendor.js',
          'vendor.js',
          'tts-features.js',
          'content.ts.js'
        ];
        
        // Add chunks that aren't already present
        chunksToInject.forEach(chunk => {
          if (!allUrlsEntry.resources.includes(chunk)) {
            allUrlsEntry.resources.push(chunk);
          }
        });
        
        // Validate that injected chunks actually exist in bundle
        const missingChunks = chunksToInject.filter(chunk => 
          !Object.keys(bundle).some(key => key.includes(chunk.replace('.js', '')))
        );

        if (missingChunks.length > 0) {
          console.warn('⚠️  Some injected chunks may not exist:', missingChunks);
        }
        
        // ONNX files to inject (derived from source paths)
        const onnxFilesToInject = ONNX_FILES.map(src => src.split('/').pop());
        
        // Add ONNX files that aren't already present
        onnxFilesToInject.forEach(onnxFile => {
          if (!allUrlsEntry.resources.includes(onnxFile)) {
            allUrlsEntry.resources.push(onnxFile);
          }
        });
        
        // Set use_dynamic_url to false
        allUrlsEntry.use_dynamic_url = false;
        
        // Write modified manifest back to disk
        writeFileSync(manifestPath, JSON.stringify(manifestData, null, 2));
        
        console.log('✓ Injected manual chunks and ONNX files into manifest.json');
      } catch (error) {
        console.error('❌ Failed to process manifest:', error);
        throw new Error(`Manifest injection failed: ${error.message}`);
      }
    }
  };
}

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
    injectManualChunks()
  ],
  build: {
    rollupOptions: {
      input: {
        popup: 'src/popup/index.html',
        display: 'src/display/index.html'
      },
      output: {
        // Disable filename hashing for Chrome extension compatibility
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
        manualChunks: (id) => {
          // Vendor libraries chunk
          if (id.includes('node_modules')) {
            // Large TTS-related libraries
            if (id.includes('kokoro-js') || id.includes('@mozilla/readability')) {
              return 'tts-vendor';
            }
            // React and core libraries
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            // Other vendor libraries
            return 'vendor';
          }
          
          // Group all TTS-related application code together
          if (id.includes('src/services/tts-service') || 
              id.includes('src/services/lazy-tts-service') ||
              id.includes('src/hooks/useAudioPlayer') ||
              id.includes('src/hooks/useLazyTTS') ||
              id.includes('src/components/AudioControls') ||
              id.includes('src/utils/audio-utils')) {
            return 'tts-features';
          }
          
          // Default chunk for other application code
          return undefined;
        }
      }
    },
    sourcemap: true,
    // Optimize chunk sizes
    chunkSizeWarningLimit: 1000
  }
})
