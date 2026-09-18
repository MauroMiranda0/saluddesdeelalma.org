import Link from "next/link";

export const AdminAccessLink = () => (
  <Link
    href="/admin/login"
    className="mt-4 inline-block text-xs text-[#f7dfbb] underline underline-offset-4 hover:text-white"
  >
    Acceso administrativo
  </Link>
);
