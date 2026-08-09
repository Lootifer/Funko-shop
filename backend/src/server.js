import app from "./app.js";
import { ensureRuntimeSchema } from "./db/ensure-schema.js";

const PORT = Number(process.env.PORT) || 3001;

await ensureRuntimeSchema();

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Lootifer API listening on http://localhost:${PORT}`);
});
