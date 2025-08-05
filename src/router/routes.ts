import { Router, Request, Response } from 'express';

const routes = Router();

routes.get('/', async (req: Request, res: Response) => {
  res.send({ status: true, msg: 'Teen Patti 2.0 Game Testing Successfully 👍' });
});

export { routes };
