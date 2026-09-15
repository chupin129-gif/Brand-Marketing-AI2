const fs = require('fs');
let code = fs.readFileSync('services/geminiService.ts', 'utf8');

const regex = /\/\/ 1\. Generate Thumbnail[\s\S]*?\/\/ 2\. Generate Infographic Body Image[\s\S]*?return \{ thumbnailUrl, infographicUrl \};/;

const replacement = `// 1. Generate Thumbnail
    let thumbnailUrl = '';
    try {
      const thumbnailResponse = await ai.models.generateImages({
        model: 'imagen-3.0-generate-002',
        prompt: thumbnailPrompt,
        config: {
          numberOfImages: 1,
          aspectRatio: thumbnailRatio as any,
          outputMimeType: 'image/jpeg'
        }
      });
      const base64Thumb = thumbnailResponse.generatedImages?.[0]?.image?.imageBytes;
      if (base64Thumb) {
        thumbnailUrl = \`data:image/jpeg;base64,\${base64Thumb}\`;
      }
    } catch (err) {
      console.error("Thumbnail generation error:", err);
    }

    // 2. Generate Infographic Body Image
    let infographicUrl = '';
    try {
      const infographicResponse = await ai.models.generateImages({
        model: 'imagen-3.0-generate-002',
        prompt: infographicPrompt,
        config: {
          numberOfImages: 1,
          aspectRatio: infographicRatio as any,
          outputMimeType: 'image/jpeg'
        }
      });
      const base64Info = infographicResponse.generatedImages?.[0]?.image?.imageBytes;
      if (base64Info) {
        infographicUrl = \`data:image/jpeg;base64,\${base64Info}\`;
      }
    } catch (err) {
      console.error("Infographic generation error:", err);
    }

    return { thumbnailUrl, infographicUrl };`;

code = code.replace(regex, replacement);
fs.writeFileSync('services/geminiService.ts', code);
