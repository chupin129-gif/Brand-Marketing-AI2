const fs = require('fs');
let code = fs.readFileSync('services/geminiService.ts', 'utf8');

const regex1 = /const thumbnailResponse = await ai\.models\.generateImages\(\{[\s\S]*?model: 'imagen-3\.0-generate-002',[\s\S]*?prompt: thumbnailPrompt,[\s\S]*?config: \{[\s\S]*?numberOfImages: 1,[\s\S]*?aspectRatio: thumbnailRatio as any,[\s\S]*?outputMimeType: 'image\/jpeg'[\s\S]*?\}[\s\S]*?\}\);[\s\S]*?const base64Thumb = thumbnailResponse\.generatedImages\?\.\[0\]\?\.image\?\.imageBytes;[\s\S]*?if \(base64Thumb\) \{[\s\S]*?thumbnailUrl = \`data:image\/jpeg;base64,\$\{base64Thumb\}\`;[\s\S]*?\}/;

const replacement1 = `const thumbnailResponse = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: thumbnailPrompt,
        config: {
          imageConfig: { aspectRatio: thumbnailRatio as any }
        }
      });
      const thumbnailCandidates = thumbnailResponse.candidates?.[0]?.content?.parts;
      if (thumbnailCandidates) {
        for (const part of thumbnailCandidates) {
          if (part.inlineData) {
            thumbnailUrl = \`data:\${part.inlineData.mimeType};base64,\${part.inlineData.data}\`;
            break;
          }
        }
      }`;
code = code.replace(regex1, replacement1);

const regex2 = /const infographicResponse = await ai\.models\.generateImages\(\{[\s\S]*?model: 'imagen-3\.0-generate-002',[\s\S]*?prompt: infographicPrompt,[\s\S]*?config: \{[\s\S]*?numberOfImages: 1,[\s\S]*?aspectRatio: infographicRatio as any,[\s\S]*?outputMimeType: 'image\/jpeg'[\s\S]*?\}[\s\S]*?\}\);[\s\S]*?const base64Info = infographicResponse\.generatedImages\?\.\[0\]\?\.image\?\.imageBytes;[\s\S]*?if \(base64Info\) \{[\s\S]*?infographicUrl = \`data:image\/jpeg;base64,\$\{base64Info\}\`;[\s\S]*?\}/;

const replacement2 = `const infographicResponse = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: infographicPrompt,
        config: {
          imageConfig: { aspectRatio: infographicRatio as any }
        }
      });
      const infographicCandidates = infographicResponse.candidates?.[0]?.content?.parts;
      if (infographicCandidates) {
        for (const part of infographicCandidates) {
          if (part.inlineData) {
            infographicUrl = \`data:\${part.inlineData.mimeType};base64,\${part.inlineData.data}\`;
            break;
          }
        }
      }`;
code = code.replace(regex2, replacement2);

fs.writeFileSync('services/geminiService.ts', code);
