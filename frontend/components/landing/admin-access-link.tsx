import Link from "next/link";

export const AdminAccessLink = () => (
  <Link
    href="/admin/login"
    className="mt-4 inline-block text-xs !text-[#7e5d41] underline underline-offset-4 hover:!text-[#65482f]"
  >
    Acceso administrativo
  </Link>
);
