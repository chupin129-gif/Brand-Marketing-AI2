try {
  throw new Error("test");
} catch(e) {
  console.log("Failed: " + (e instanceof Error ? e.message : JSON.stringify(e)));
}
