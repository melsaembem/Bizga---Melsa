export const ADMIN_WHATSAPP = import.meta.env.VITE_ADMIN_WHATSAPP || "628123456789";

export const WA_REGISTRATION_MESSAGE = `Halo Admin Bizga 👋

Saya ingin mendaftarkan usaha/jasa saya ke Katalog Duren Sawit.

Berikut data usaha saya:

📌 Nama Usaha:
📌 Jenis Usaha:
📌 Deskripsi:
📌 Harga:
📌 Lokasi (Duren Sawit):
📌 Jam Operasional:
📌 Nomor WhatsApp:
📌 Foto Produk/Jasa (kirim di chat):

Terima kasih 🙏`;

export const getWARegistrationLink = () => {
  const encodedMessage = encodeURIComponent(WA_REGISTRATION_MESSAGE);
  return `https://wa.me/${ADMIN_WHATSAPP}?text=${encodedMessage}`;
};
