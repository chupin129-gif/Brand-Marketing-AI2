const fs = require('fs');
let code = fs.readFileSync('services/geminiService.ts', 'utf8');

const replacement = `  } catch (error) {
    console.error("Error generating images:", error);
    const errorStr = error instanceof Error ? error.message : JSON.stringify(error);
    if (errorStr.includes('403') || errorStr.includes('PERMISSION_DENIED')) {
      throw new Error("Gemini API 키에 이미지 생성(Imagen 3) 권한이 없습니다. 구글 AI Studio에서 결제 계정을 연동하거나 Imagen 약관에 동의해야 합니다.");
    }
    throw new Error("Failed to generate images: " + errorStr);
  }
};`;

code = code.replace(/  \} catch \(error\) \{\s*console\.error\("Error generating images:", error\);\s*throw new Error\("Failed to generate images: " \+ \(error instanceof Error \? error\.message : JSON\.stringify\(error\)\)\);\s*\}\s*\};\s*$/, replacement);
fs.writeFileSync('services/geminiService.ts', code);
