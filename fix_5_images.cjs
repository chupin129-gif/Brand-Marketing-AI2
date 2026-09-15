const fs = require('fs');
let code = fs.readFileSync('services/geminiService.ts', 'utf8');

const regex3 = /const imgResponse = await ai\.models\.generateImages\(\{[\s\S]*?model: 'imagen-3\.0-generate-002',[\s\S]*?prompt: item\.prompt,[\s\S]*?config: \{[\s\S]*?numberOfImages: 1,[\s\S]*?aspectRatio: '1:1',[\s\S]*?outputMimeType: 'image\/jpeg'[\s\S]*?\}[\s\S]*?\}\);[\s\S]*?const base64ImageBytes = imgResponse\.generatedImages\?\.\[0\]\?\.image\?\.imageBytes;[\s\S]*?if \(base64ImageBytes\) \{[\s\S]*?generatedImages\.push\(\{[\s\S]*?url: \`data:image\/jpeg;base64,\$\{base64ImageBytes\}\`,[\s\S]*?caption: item\.caption,[\s\S]*?locationHint: item\.locationHint,[\s\S]*?roleTitle: item\.roleTitle[\s\S]*?\}\);[\s\S]*?\}/;

const replacement3 = `const imgResponse = await ai.models.generateContent({
              model: 'gemini-3.1-flash-lite-image',
              contents: item.prompt,
              config: {
                imageConfig: { aspectRatio: '1:1' as any }
              }
            });
            const candidates = imgResponse.candidates?.[0]?.content?.parts;
            if (candidates) {
              for (const part of candidates) {
                if (part.inlineData) {
                  generatedImages.push({
                    url: \`data:\${part.inlineData.mimeType};base64,\${part.inlineData.data}\`,
                    caption: item.caption,
                    locationHint: item.locationHint,
                    roleTitle: item.roleTitle
                  });
                  break;
                }
              }
            }`;
            
code = code.replace(regex3, replacement3);
fs.writeFileSync('services/geminiService.ts', code);
