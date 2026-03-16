import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/requireLogin";
import { CATEGORY_CATALOG } from "../data/categoryCatalog";

const router = Router();

router.use(requireAuth);

router.get("/tree", (_req: Request, res: Response) => {
  return res.json({
    majorCategories: CATEGORY_CATALOG
  });
});

router.get("/flat", (_req: Request, res: Response) => {
  const subcategories = CATEGORY_CATALOG.flatMap((major) =>
    major.subcategories.map((sub) => ({
      ...sub,
      majorKey: major.key,
      majorName: major.name
    }))
  );

  return res.json({ subcategories });
});

export default router;
