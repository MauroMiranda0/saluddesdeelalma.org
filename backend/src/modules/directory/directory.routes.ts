import type { RequestHandler } from "express";
import { Router } from "express";

import { authenticate } from "../../middleware/authenticate";
import { authorizeAdminIdentity } from "../../middleware/authorize-admin-identity";
import { asyncHandler } from "../../middleware/error-handler";
import { fetchDirectory } from "./directory.service";

type DirectoryRouteDependencies = {
  authenticate: RequestHandler;
  authorizeAdmin: RequestHandler;
  fetchDirectory: typeof fetchDirectory;
};

export const createDirectoryRoutes = (
  dependencies: Partial<DirectoryRouteDependencies> = {}
) => {
  const router = Router();
  const authenticateRequest = dependencies.authenticate ?? authenticate;
  const authorizeRequest =
    dependencies.authorizeAdmin ?? authorizeAdminIdentity;
  const directory = dependencies.fetchDirectory ?? fetchDirectory;

  router.get(
    "/directory",
    authenticateRequest,
    authorizeRequest,
    asyncHandler(async (_request, response) => {
      response.json(await directory());
    })
  );

  return router;
};

export const directoryRoutes = createDirectoryRoutes();
