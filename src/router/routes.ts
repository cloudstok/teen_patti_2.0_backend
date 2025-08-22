import { Router, Request, Response } from 'express';
import { read } from '../utilities/db-connection';

const routes = Router();

routes.get('/', async (req: Request, res: Response) => {
  res.send({ status: true, msg: 'Teen Patti 2.0 Game Testing Successfully 👍' });
});


routes.get('/bet-history', async (req, res) => {
  try {
    const { user_id, operator_id, limit } = req.query as {
      user_id: string;
      operator_id: string;
      limit: string
    };
    if (!user_id || !operator_id) {
      return res.status(400).json({ status: false, message: 'Required params : user_id and operator_id' });
    };

    const limitNum = parseInt(limit, 10)
    const result = await read(
      `SELECT * 
     FROM settlement
     WHERE user_id = ? AND operator_id = ? 
     ORDER BY created_at DESC 
     LIMIT ?`,
      [user_id, operator_id, limitNum]
    );


    if (!result || result.length === 0) {
     return res.status(404).json({ status: false, data: result })
    }
    return res.status(200).json({ status: true, data: result });
  } catch (err: any) {
    return res.status(500).json({ status: false, message: 'Error fetching game history', error: err.message });
  };
});


export { routes };
