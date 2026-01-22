import { isExtensionContextAvailable } from '../utils/extension-utils';
import { lazyTTSService } from './lazy-tts-service';

export interface AudioDiagnosticResult {
  category: string;
  checks: Array<{
    name: string;
    passed: boolean;
    details: string;
    value?: any;
  }>;
}

export class AudioDiagnostics {
  async runFullDiagnostics(): Promise<AudioDiagnosticResult[]> {
    const results: AudioDiagnosticResult[] = [];
    
    results.push(await this.checkExtensionContext());
    results.push(await this.checkAudioAPIs());
    results.push(await this.checkCSPCompliance());
    results.push(await this.checkBlobSupport());
    results.push(await this.checkWebGPUStatus());
    results.push(await this.checkTTSStatus());
    
    return results;
  }
  
  private async checkExtensionContext(): Promise<AudioDiagnosticResult> {
    const checks = [];
    
    // Cache the result to avoid redundant calls
    const isAvailable = isExtensionContextAvailable();
    
    checks.push({
      name: 'Extension Context Available',
      passed: isAvailable,
      details: isAvailable ? 'Chrome extension APIs accessible' : 'Extension context not available'
    });
    
    checks.push({
      name: 'Chrome Runtime ID',
      passed: !!(chrome?.runtime?.id),
      details: chrome?.runtime?.id ? `Runtime ID: ${chrome.runtime.id}` : 'No runtime ID available',
      value: chrome?.runtime?.id
    });
    
    return { category: 'Extension Context', checks };
  }
  
  private async checkAudioAPIs(): Promise<AudioDiagnosticResult> {
    const checks = [];
    
    checks.push({
      name: 'HTML5 Audio Support',
      passed: typeof Audio !== 'undefined',
      details: typeof Audio !== 'undefined' ? 'HTML5 Audio constructor available' : 'HTML5 Audio not supported'
    });
    
    checks.push({
      name: 'Web Audio API',
      passed: typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined',
      details: 'Web Audio API availability'
    });
    
    checks.push({
      name: 'Blob URL Support',
      passed: typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function',
      details: 'Blob URL creation support'
    });
    
    return { category: 'Audio APIs', checks };
  }
  
  private async checkCSPCompliance(): Promise<AudioDiagnosticResult> {
    const checks = [];
    
    // Test blob URL creation
    try {
      const testBlob = new Blob(['test'], { type: 'text/plain' });
      const testUrl = URL.createObjectURL(testBlob);
      URL.revokeObjectURL(testUrl);
      
      checks.push({
        name: 'Blob URL Creation',
        passed: true,
        details: 'Can create and revoke blob URLs'
      });
    } catch (error) {
      checks.push({
        name: 'Blob URL Creation',
        passed: false,
        details: `Blob URL creation failed: ${error instanceof Error ? error.message : String(error)}`
      });
    }
    
    return { category: 'CSP Compliance', checks };
  }
  
  private async checkBlobSupport(): Promise<AudioDiagnosticResult> {
    const checks = [];
    
    try {
      // Test audio blob creation
      const testAudio = new Float32Array([0.1, -0.1, 0.2, -0.2]);
      const buffer = new ArrayBuffer(44 + testAudio.length * 2);
      const blob = new Blob([buffer], { type: 'audio/wav' });
      
      checks.push({
        name: 'Audio Blob Creation',
        passed: blob.size > 0,
        details: `Created ${blob.size} byte audio blob`,
        value: blob.size
      });
      
      const url = URL.createObjectURL(blob);
      checks.push({
        name: 'Audio Blob URL',
        passed: url.startsWith('blob:'),
        details: `Generated blob URL: ${url.substring(0, 30)}...`,
        value: url.length
      });
      
      URL.revokeObjectURL(url);
    } catch (error) {
      checks.push({
        name: 'Audio Blob Support',
        passed: false,
        details: `Audio blob test failed: ${error}`
      });
    }
    
    return { category: 'Blob Support', checks };
  }
  
  private async checkWebGPUStatus(): Promise<AudioDiagnosticResult> {
    const checks = [];
    
    checks.push({
      name: 'WebGPU Available',
      passed: 'gpu' in navigator,
      details: 'gpu' in navigator ? 'WebGPU API available' : 'WebGPU not supported'
    });
    
    if ('gpu' in navigator) {
      try {
        const adapter = await (navigator as any).gpu.requestAdapter();
        checks.push({
          name: 'WebGPU Adapter',
          passed: !!adapter,
          details: adapter ? 'WebGPU adapter obtained' : 'No WebGPU adapter available'
        });
      } catch (error) {
        checks.push({
          name: 'WebGPU Adapter',
          passed: false,
          details: `WebGPU adapter request failed: ${error}`
        });
      }
    }
    
    return { category: 'WebGPU Status', checks };
  }
  
  private async checkTTSStatus(): Promise<AudioDiagnosticResult> {
    const checks = [];
    
    const serviceState = lazyTTSService.getLoadingState();
    
    checks.push({
      name: 'TTS Service Loaded',
      passed: serviceState.isLoaded,
      details: serviceState.isLoaded ? 'TTS service loaded successfully' : 'TTS service not loaded'
    });
    
    checks.push({
      name: 'TTS Service Ready',
      passed: lazyTTSService.isReady(),
      details: lazyTTSService.isReady() ? 'TTS service ready for use' : 'TTS service not ready'
    });
    
    checks.push({
      name: 'TTS Loading State',
      passed: !serviceState.isLoading,
      details: serviceState.isLoading ? 'TTS service currently loading' : 'TTS service not loading'
    });
    
    if (serviceState.error) {
      checks.push({
        name: 'TTS Error Status',
        passed: false,
        details: `TTS error: ${serviceState.error}`,
        value: serviceState.error
      });
    } else {
      checks.push({
        name: 'TTS Error Status',
        passed: true,
        details: 'No TTS errors detected'
      });
    }
    
    return { category: 'TTS Status', checks };
  }
}

export const audioDiagnostics = new AudioDiagnostics();
