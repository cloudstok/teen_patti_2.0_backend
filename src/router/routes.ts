import { Router, Request, Response } from 'express';
import { read } from '../utilities/db-connection';

const routes = Router();

routes.get('/', async (req: Request, res: Response) => {
  res.send({ status: true, msg: 'Teen Patti 2.0 Game Testing Successfully 👍' });
});


routes.get('/bet-history', async (req, res) => {
  try {
    const { user_id, operator_id } = req.query as {
      user_id: string;
      operator_id: string;
    };
    if (!user_id || !operator_id) {
      res.status(400).json({ status: false, message: 'Required params : user_id and operator_id' });
    };

    const result = await read(
     `SELECT * 
     FROM settlement 
     WHERE user_id = ? AND operator_id = ? 
     ORDER BY created_at DESC 
     LIMIT 10 OFFSET 10`,
      [user_id, operator_id]
    );

    if (!result || result.length === 0) {
      res.status(404).json({ status: false, data: result })
    }
    res.status(200).json({ status: true, data: result });
  } catch (err: any) {
    res.status(500).json({ status: false, message: 'Error fetching game history', error: err.message });
  };
});


export { routes };
