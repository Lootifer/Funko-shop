// Gebruik alleen cijfers met landcode, zonder +, spaties of streepjes.
// Vervang dit nummer later door het zakelijke WhatsApp-nummer van Lootifer.
export const LOOTIFER_WHATSAPP_NUMBER = "31612345678";

export const getLootiferWhatsAppUrl = (message = "") => {
  const number = String(LOOTIFER_WHATSAPP_NUMBER || "").replace(/\D/g, "");
  const encodedMessage = encodeURIComponent(String(message || ""));
  return number
    ? `https://wa.me/${number}?text=${encodedMessage}`
    : `https://api.whatsapp.com/send?text=${encodedMessage}`;
};
