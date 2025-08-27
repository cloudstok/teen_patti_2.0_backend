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
      `SELECT lobby_id, user_id, operator_id, bet_amount, userBets, result, win_amount, created_at
     FROM settlement
     WHERE user_id = ? AND operator_id = ? 
     ORDER BY created_at DESC 
     LIMIT ?`,
      [user_id, operator_id, limitNum]
    );

    if (!result || result.length === 0) {
      return res.status(200).json({ status: false, data: result })
    }
    const finalResult = result.flatMap((row: any) => {
      let parsedBets = JSON.parse(row.userBets);

      if (!Array.isArray(parsedBets)) parsedBets = [parsedBets];

      return parsedBets.map((bet: any) => ({
        [`betResult`]: bet,
        lobby_id: row.lobby_id,
        user_id: row.user_id,
        operator_id: row.operator_id,
        bet_amount: row.bet_amount,
        result: row.result,
        win_amount: row.win_amount,
        created_at: row.created_at,
      }));
    });

    return res.status(200).json({ status: true, data: finalResult });
  } catch (err: any) {
    return res.status(500).json({ status: false, message: 'Error fetching game history', error: err.message });
  };
});


routes.get('/game-history', async (req, res) => {
  try {
    const { user_id, operator_id, limit } = req.query as {
      user_id: string;
      operator_id: string;
      limit: string;
    };

    if (!user_id || !operator_id) {
      return res.status(400).json({
        status: false,
        message: 'Required params : user_id and operator_id'
      });
    }

    const limitNum = parseInt(limit, 10);
    const result = await read(
      `SELECT lobby_id, userBets
       FROM settlement
       WHERE user_id = ? AND operator_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [user_id, operator_id, limitNum]
    );

    if (!result?.length) {
      return res.status(200).json({ status: false, data: [] });
    }

    const finalResult = result.flatMap((row: any) => {
      let parsedBets = JSON.parse(row.userBets);
      if (!Array.isArray(parsedBets)) parsedBets = [parsedBets];

      return parsedBets.map((bet: any) => ({
        [`betResult`]: {
          chip: bet.chip,
          betAmount:Number(bet.betAmount).toFixed(2),
          winAmount: Number(bet.winAmount).toFixed(2),
          mult: Number(bet.mult).toFixed(2),
          status:bet.status
        },
        lobby_id: row.lobby_id
      }));
    });

    return res.status(200).json({ status: true, data: finalResult });
  } catch (err: any) {
    return res.status(500).json({status: false,message: 'Error fetching game history',error: err.message});
  }
});

routes.get('/bet-history-updated', async (req, res) => {
  try {
    const { user_id, operator_id, lobby_id, id } = req.query as {
      user_id: string;
      operator_id: string;
      id: string;
      lobby_id:string
    };

    if (!user_id || !operator_id) {
      return res.status(400).json({status: false,message: 'Required params : user_id and operator_id'})}

    const result = await read(
      `SELECT lobby_id, user_id, result, userBets, created_at
       FROM settlement
       WHERE user_id = ? AND operator_id = ? AND lobby_id = ?
       ORDER BY created_at DESC`,
      [user_id, operator_id, lobby_id]
    );

    if (!result?.length) {
      return res.status(200).json({ status: false, data: [] });
    }

      const row = result[0]
      const parsedBets = JSON.parse(row.userBets);
      const bet = parsedBets.find((bet:any) => bet.chip == id)

      if(!bet) return res.status(200).json({status:false,data:[]})
         
      return res.status(200).json({status:true,
        betResult: {
          chip:bet.chip,
          betAnount: Number(bet.betAmount).toFixed(2),
          winAmount: Number(bet.winAmount).toFixed(2),
          mult: Number(bet.mult).toFixed(2),
          status:bet.status
        },
        user_id: row.user_id,
        result: row.result,
        created_at: row.created_at,
      })

  } catch (err: any) {
    return res.status(500).json({status: false,message: 'Error fetching game history',error: err.message});
  }
});

export { routes };
