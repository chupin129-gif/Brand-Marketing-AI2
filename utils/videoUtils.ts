import * as gifencPkg from 'gifenc';

// Fix for "The requested module 'gifenc' does not provide an export named 'GIFEncoder'"
// This handles cases where esm.sh might bundle it as CJS or ESM differently.
const gifenc = (gifencPkg as any).default || gifencPkg;
const { GIFEncoder, quantize, applyPalette } = gifenc;

/**
 * Extracts frames from a video file at specified intervals.
 * Also generates a short GIF from a segment.
 */
export const processVideoFile = async (file: File): Promise<{ gif: string; captures: string[] }> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.src = URL.createObjectURL(file);
    video.load();

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) {
      reject(new Error('Canvas context not supported'));
      return;
    }

    const captures: string[] = [];
    
    // Config for GIF
    const gifWidth = 320; // Resize for performance
    const gifHeight = 240; // Default, will adjust aspect ratio
    const gifDurationSeconds = 2; 
    const gifFps = 5;
    
    // Check if GIFEncoder is available
    if (!GIFEncoder) {
      reject(new Error('GIFEncoder library not loaded correctly'));
      return;
    }
    let gifEncoder;
    try {
      gifEncoder = new GIFEncoder();
    } catch(e) {
      gifEncoder = (GIFEncoder as any)();
    }
    
    // We will capture frames into this array for the GIF
    const gifFrames: { data: Uint8ClampedArray; width: number; height: number }[] = [];

    video.onloadedmetadata = async () => {
      const duration = video.duration;
      const width = video.videoWidth;
      const height = video.videoHeight;
      
      // Calculate GIF dimensions maintaining aspect ratio
      const aspectRatio = width / height;
      const finalGifWidth = gifWidth;
      const finalGifHeight = Math.floor(gifWidth / aspectRatio);

      canvas.width = width;
      canvas.height = height;

      // 1. Extract 3 High-Quality Captures (Start, Middle, Late)
      const capturePoints = [duration * 0.2, duration * 0.5, duration * 0.8];
      
      for (const time of capturePoints) {
        await seekToTime(video, time);
        ctx.drawImage(video, 0, 0, width, height);
        // High quality JPEG for Gemini analysis and Blog display
        captures.push(canvas.toDataURL('image/jpeg', 0.8));
      }

      // 2. Generate GIF from a 2-second segment (starting at 20%)
      const gifStartTime = duration * 0.2;
      const frameInterval = 1 / gifFps;
      const totalGifFrames = gifDurationSeconds * gifFps;
      
      // Resize canvas for GIF processing (faster encoding)
      canvas.width = finalGifWidth;
      canvas.height = finalGifHeight;

      for (let i = 0; i < totalGifFrames; i++) {
        await seekToTime(video, gifStartTime + (i * frameInterval));
        ctx.drawImage(video, 0, 0, finalGifWidth, finalGifHeight);
        
        const imageData = ctx.getImageData(0, 0, finalGifWidth, finalGifHeight);
        gifFrames.push({
          data: imageData.data,
          width: finalGifWidth,
          height: finalGifHeight
        });
      }

      // Encode GIF
      // Using gifenc logic: quantize -> applyPalette -> writeFrame
      for (const frame of gifFrames) {
        // quantize returns a palette (array of rgb)
        // applyPalette returns index array
        const palette = quantize(frame.data, 256);
        const index = applyPalette(frame.data, palette);
        gifEncoder.writeFrame(index, finalGifWidth, finalGifHeight, { palette, delay: 200 }); // 200ms = 5fps
      }
      
      gifEncoder.finish();
      const gifBuffer = gifEncoder.bytes();
      const gifBlob = new Blob([gifBuffer], { type: 'image/gif' });
      
      // Convert Blob to Base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const gifBase64 = reader.result as string;
        URL.revokeObjectURL(video.src); // Cleanup
        resolve({ gif: gifBase64, captures });
      };
      reader.readAsDataURL(gifBlob);
    };

    video.onerror = (e) => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Error processing video file'));
    };
  });
};

const seekToTime = (video: HTMLVideoElement, time: number): Promise<void> => {
  return new Promise((resolve) => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      resolve();
    };
    video.addEventListener('seeked', onSeeked);
    video.currentTime = time;
  });
};