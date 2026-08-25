import { GIFEncoder } from 'gifenc';
try {
  const gif = new GIFEncoder();
  console.log("new worked");
} catch(e) {
  console.log("new failed:", e.message);
}
try {
  const gif2 = GIFEncoder();
  console.log("factory worked");
} catch(e) {
  console.log("factory failed:", e.message);
}
