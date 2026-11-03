export const hashPassword = async (_password: string): Promise<string> => {
  throw new Error("password hashing disabled: authentication uses Supabase Auth");
};

export const verifyPassword = async (
  _password: string,
  _storedHash: string
): Promise<boolean> => {
  throw new Error("password verification disabled: authentication uses Supabase Auth");
};
