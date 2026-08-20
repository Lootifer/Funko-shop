import app from "./app.js";
import { ensureRuntimeSchema } from "./db/ensure-schema.js";
import { repairEmbeddedProductMedia } from "./services/product-media-storage.js";

const PORT = Number(process.env.PORT) || 3001;

await ensureRuntimeSchema();

try {
  const repair = await repairEmbeddedProductMedia();
  if (repair.repairedProducts > 0) {
    // eslint-disable-next-line no-console
    console.log(`Lootifer media repair: ${repair.repairedProducts} product(en), ${repair.savedImages} foto('s) hersteld.`);
    // eslint-disable-next-line no-console
    console.log(`Veilige database-back-up: ${repair.backupPath}`);
  }
} catch (error) {
  // Keep the API available even if the automatic media cleanup cannot complete.
  // The serializer below strips embedded media from responses as an additional safety net.
  // eslint-disable-next-line no-console
  console.error("Lootifer media repair kon niet worden uitgevoerd:", error);
}

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Lootifer API listening on http://localhost:${PORT}`);
});
