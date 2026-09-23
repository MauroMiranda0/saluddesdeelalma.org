import Link from "next/link";

export const AdminAccessLink = () => (
  <Link
    href="/admin/login"
    className="mt-4 inline-block text-xs !text-white underline underline-offset-4 hover:!text-[#d9cbb3]"
  >
    Acceso administrativo
  </Link>
);
